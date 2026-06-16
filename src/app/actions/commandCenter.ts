"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getAIProvider } from "@/lib/ai/provider";
import { ROLES, isRoleId, type RoleId } from "@/lib/roles/registry";

export type ProposedActionKind = "draft" | "plan" | "summary" | "checklist" | "memo" | "brief";

export interface ProposedAction {
  kind: ProposedActionKind;
  title: string;
  body: string;
  /** What approval/next step is required. Nothing is sent automatically. */
  requiresApproval: boolean;
  note: string;
}

function classifyCommand(command: string): ProposedActionKind {
  const c = command.toLowerCase();
  if (c.includes("draft") || c.includes("email") || c.includes("follow-up") || c.includes("follow up") || c.includes("update")) return "draft";
  if (c.includes("summar")) return "summary";
  if (c.includes("checklist")) return "checklist";
  if (c.includes("memo")) return "memo";
  if (c.includes("brief") || c.includes("prepare")) return "brief";
  return "plan";
}

/**
 * Runs a role-aware command and returns a PROPOSED local action. This never sends
 * email and never writes to an external calendar. The result is a local draft/plan
 * the user can review, then explicitly save or approve.
 */
export async function runRoleCommand(input: {
  role: string;
  command: string;
  context?: string;
}): Promise<{ success: boolean; action?: ProposedAction; error?: string }> {
  const role: RoleId = isRoleId(input.role) ? input.role : "public_personal";
  const command = (input.command || "").trim();
  if (!command) return { success: false, error: "Enter a command." };

  const context = (input.context || "").trim();
  const kind = classifyCommand(command);

  try {
    const ai = await getAIProvider();
    // Find the closest role workflow to ground the output.
    const def = ROLES[role];
    const match = def.workflows.find((w) =>
      command.toLowerCase().includes(w.name.toLowerCase().split(" ")[0])
    );

    let body: string;
    if (kind === "summary" && context) {
      body = await ai.summarizeDocument(context);
    } else {
      // Compose a structured local proposal grounded in the role workflow template.
      const template = match?.prompt ?? `Respond to this ${def.label} request: {context}`;
      const filled = template.replace("{context}", context || command);
      const lines: string[] = [];
      lines.push(`Role: ${def.label}`);
      lines.push(`Request: ${command}`);
      if (context) lines.push(`Context provided: yes`);
      lines.push("");
      lines.push("Proposed local output:");
      lines.push(filled);
      lines.push("");
      lines.push(
        "(Local rules-based assistant. Connect a local Ollama model in Settings for richer generation. This is a proposal — nothing was sent or scheduled.)"
      );
      body = lines.join("\n");
    }

    const title = `${def.label}: ${command}`.slice(0, 120);
    const action: ProposedAction = {
      kind,
      title,
      body,
      requiresApproval: kind === "draft",
      note:
        kind === "draft"
          ? "Save as a local draft, then review and send manually from your provider. Personal Assist never sends email."
          : "Save as a local note/plan. External actions (calendar writes, provider drafts) require explicit approval.",
    };

    await logAudit("command_center_proposed", "CommandCenter", role, { command, kind });
    return { success: true, action };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message || "Command failed" };
  }
}

/** Persists a proposed action as a LOCAL draft (status "draft"). Never sends. */
export async function saveProposedDraft(input: { title: string; body: string; role: string }) {
  try {
    const draft = await prisma.emailDraft.create({
      data: {
        type: "new_email",
        subject: input.title,
        body: input.body,
        status: "draft", // stays a local draft; requires approval before any provider draft
        aiGenerated: true,
        metadata: JSON.stringify({ source: "command_center", role: input.role }),
      },
    });
    await logAudit("command_center_draft_saved", "EmailDraft", draft.id, { role: input.role });
    revalidatePath("/drafts");
    return { success: true, id: draft.id };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

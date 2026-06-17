"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { hashAgreement, hashFinal } from "@/lib/agreements/hashing";
import { validateFieldValue, incompleteRequiredFields } from "@/lib/agreements/fields";
import { canRecipientSign, deriveAgreementStatus } from "@/lib/agreements/signing";
import { extractClauses } from "@/lib/agreements/clauseExtraction";
import { scoreAgreementRisks } from "@/lib/agreements/riskScoring";
import { buildCertificate } from "@/lib/agreements/certificates";
import { answerAgreementQuestion } from "@/lib/agreements/qa";
import { buildAuditTimeline } from "@/lib/agreements/audit";
import { STARTER_TEMPLATES, parseDefaults } from "@/lib/agreements/templates";
import type { FieldType, RecipientDef, FieldDef } from "@/lib/agreements/types";

async function audit(agreementId: string, action: string, actor?: string, detail?: string) {
  await prisma.agreementAuditEvent.create({ data: { agreementId, action, actor: actor || "owner", detail: detail || null } });
}

async function recipientDefs(agreementId: string): Promise<RecipientDef[]> {
  const rs = await prisma.agreementRecipient.findMany({ where: { agreementId }, orderBy: { routingOrder: "asc" } });
  return rs.map((r) => ({ id: r.id, name: r.name, routingOrder: r.routingOrder, required: r.required, status: r.status as RecipientDef["status"] }));
}
async function fieldDefs(agreementId: string): Promise<FieldDef[]> {
  const fs = await prisma.agreementField.findMany({ where: { agreementId } });
  return fs.map((f) => ({ id: f.id, type: f.type as FieldType, recipientId: f.recipientId, required: f.required, value: f.value }));
}

async function recomputeStatus(agreementId: string) {
  const ag = await prisma.agreement.findUnique({ where: { id: agreementId } });
  if (!ag) return;
  const prepared = ag.status !== "draft";
  const status = deriveAgreementStatus(await recipientDefs(agreementId), prepared);
  const data: { status: string; finalHash?: string } = { status };
  if (status === "completed") {
    const fields = await prisma.agreementField.findMany({ where: { agreementId } });
    data.finalHash = hashFinal({ title: ag.title, content: ag.content, fields: fields.map((f) => ({ type: f.type, value: f.value, completedAt: f.completedAt?.toISOString() ?? null })) });
    await audit(agreementId, "completed", "system");
  }
  await prisma.agreement.update({ where: { id: agreementId }, data });
}

// ---- Create + templates --------------------------------------------------

export async function createAgreement(input: { title: string; description?: string; content?: string; category?: string; owner?: string; targetDate?: string | null }) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    const ag = await prisma.agreement.create({
      data: {
        title: input.title.trim(), description: input.description || null, content: input.content || null,
        category: input.category || null, owner: input.owner || null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        originalHash: hashAgreement({ title: input.title, content: input.content, recipients: [] }),
      },
    });
    await prisma.agreementVersion.create({ data: { agreementId: ag.id, versionNumber: 1, hash: ag.originalHash!, reason: "created" } });
    await audit(ag.id, "created");
    await logAudit("agreement_created", "Agreement", ag.id, {});
    revalidatePath("/agreements");
    return { success: true, id: ag.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function seedStarterTemplates() {
  try {
    const count = await prisma.agreementTemplate.count();
    if (count > 0) return { success: true, seeded: 0 };
    for (const t of STARTER_TEMPLATES) {
      await prisma.agreementTemplate.create({ data: { title: t.title, description: t.description, content: t.content, defaultsJson: JSON.stringify(t.defaults) } });
    }
    revalidatePath("/agreements/templates");
    return { success: true, seeded: STARTER_TEMPLATES.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function createFromTemplate(templateId: string) {
  try {
    const tpl = await prisma.agreementTemplate.findUnique({ where: { id: templateId } });
    if (!tpl) return { success: false, error: "Template not found." };
    const defaults = parseDefaults(tpl.defaultsJson);
    const ag = await prisma.agreement.create({
      data: { title: tpl.title, description: tpl.description, content: tpl.content, templateId, originalHash: hashAgreement({ title: tpl.title, content: tpl.content, recipients: [] }) },
    });
    await prisma.agreementVersion.create({ data: { agreementId: ag.id, versionNumber: 1, hash: ag.originalHash!, reason: "from_template" } });
    await audit(ag.id, "template_applied", "owner", tpl.title);

    const roleToId = new Map<string, string>();
    for (const r of defaults.recipients ?? []) {
      const rec = await prisma.agreementRecipient.create({ data: { agreementId: ag.id, name: r.role, role: r.role, routingOrder: r.order, required: r.required ?? true } });
      roleToId.set(r.role, rec.id);
      await audit(ag.id, "recipient_added", "owner", r.role);
    }
    for (const f of defaults.fields ?? []) {
      await prisma.agreementField.create({ data: { agreementId: ag.id, recipientId: f.recipientRole ? roleToId.get(f.recipientRole) ?? null : null, type: f.type, label: f.label || null, required: f.required ?? true } });
      await audit(ag.id, "field_added", "owner", f.type);
    }
    await logAudit("agreement_created_from_template", "Agreement", ag.id, {});
    revalidatePath("/agreements");
    return { success: true, id: ag.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Recipients + fields -------------------------------------------------

export async function addRecipient(agreementId: string, input: { name: string; email?: string; role?: string; routingOrder?: number; required?: boolean }) {
  try {
    if (!input.name?.trim()) return { success: false, error: "Name is required." };
    const count = await prisma.agreementRecipient.count({ where: { agreementId } });
    await prisma.agreementRecipient.create({ data: { agreementId, name: input.name.trim(), email: input.email || null, role: input.role || null, routingOrder: input.routingOrder ?? count + 1, required: input.required ?? true } });
    await audit(agreementId, "recipient_added", "owner", input.name);
    revalidatePath(`/agreements/${agreementId}/prepare`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function addField(agreementId: string, input: { type: FieldType; recipientId?: string | null; label?: string; page?: number; x?: number; y?: number; required?: boolean }) {
  try {
    await prisma.agreementField.create({ data: { agreementId, recipientId: input.recipientId || null, type: input.type, label: input.label || null, page: input.page ?? 1, x: input.x ?? 0, y: input.y ?? 0, required: input.required ?? true } });
    await audit(agreementId, "field_added", "owner", input.type);
    revalidatePath(`/agreements/${agreementId}/prepare`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function prepareAgreement(agreementId: string) {
  try {
    const recipients = await prisma.agreementRecipient.findMany({ where: { agreementId } });
    if (recipients.length === 0) return { success: false, error: "Add at least one recipient first." };
    const sigFields = await prisma.agreementField.count({ where: { agreementId, type: "signature" } });
    if (sigFields === 0) return { success: false, error: "Add at least one signature field first." };
    // create a local signing session token per recipient
    for (const r of recipients) {
      const existing = await prisma.signingSession.findFirst({ where: { agreementId, recipientId: r.id } });
      if (!existing) await prisma.signingSession.create({ data: { agreementId, recipientId: r.id, token: crypto.randomBytes(12).toString("hex") } });
    }
    await prisma.agreement.update({ where: { id: agreementId }, data: { status: "sent_for_local_signing" } });
    await audit(agreementId, "prepared", "owner");
    await logAudit("agreement_prepared", "Agreement", agreementId, {});
    revalidatePath(`/agreements/${agreementId}`);
    revalidatePath(`/agreements/${agreementId}/sign`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Signing -------------------------------------------------------------

export async function completeField(fieldId: string, value: string) {
  try {
    const field = await prisma.agreementField.findUnique({ where: { id: fieldId } });
    if (!field) return { success: false, error: "Field not found." };
    const err = validateFieldValue(field.type as FieldType, field.required, value);
    if (err) return { success: false, error: err };
    await prisma.agreementField.update({ where: { id: fieldId }, data: { value, completedAt: new Date() } });
    await audit(field.agreementId, "field_completed", undefined, field.type);
    revalidatePath(`/agreements/${field.agreementId}/sign`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function signRecipient(agreementId: string, recipientId: string) {
  try {
    const order = canRecipientSign(await recipientDefs(agreementId), recipientId);
    if (order) return { success: false, error: order };
    const incomplete = incompleteRequiredFields(await fieldDefs(agreementId), recipientId);
    if (incomplete.length > 0) return { success: false, error: `Complete ${incomplete.length} required field(s) before signing.` };
    const r = await prisma.agreementRecipient.update({ where: { id: recipientId }, data: { status: "signed", signedAt: new Date() } });
    await audit(agreementId, "recipient_signed", r.name);
    await recomputeStatus(agreementId);
    revalidatePath(`/agreements/${agreementId}`);
    revalidatePath(`/agreements/${agreementId}/sign`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function declineRecipient(agreementId: string, recipientId: string) {
  try {
    const r = await prisma.agreementRecipient.update({ where: { id: recipientId }, data: { status: "declined" } });
    await audit(agreementId, "recipient_declined", r.name);
    await recomputeStatus(agreementId);
    revalidatePath(`/agreements/${agreementId}/sign`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function voidAgreement(agreementId: string) {
  try {
    await prisma.agreement.update({ where: { id: agreementId }, data: { status: "voided" } });
    await audit(agreementId, "voided", "owner");
    revalidatePath(`/agreements/${agreementId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Certificate ---------------------------------------------------------

export async function generateCertificate(agreementId: string) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { recipients: true, fields: true, auditEvents: true } });
    if (!ag) return { success: false, error: "Not found" };
    const finalHash = ag.finalHash || hashFinal({ title: ag.title, content: ag.content, fields: ag.fields.map((f) => ({ type: f.type, value: f.value, completedAt: f.completedAt?.toISOString() ?? null })) });
    const cert = buildCertificate({
      agreementId: ag.id, title: ag.title, status: ag.status, originalHash: ag.originalHash || "(none)", finalHash,
      recipients: ag.recipients.map((r) => ({ name: r.name, role: r.role, status: r.status, signedAt: r.signedAt?.toISOString() ?? null })),
      fields: ag.fields.map((f) => ({ type: f.type, label: f.label, completed: !!f.completedAt })),
      audit: buildAuditTimeline(ag.auditEvents.map((e) => ({ action: e.action, actor: e.actor, detail: e.detail, createdAt: e.createdAt.toISOString() }))),
      generatedAt: new Date().toISOString(),
    });
    const saved = await prisma.signingCertificate.create({ data: { agreementId, originalHash: ag.originalHash || "(none)", finalHash, json: cert.json, markdown: cert.markdown } });
    await audit(agreementId, "certificate_generated", "owner");
    await logAudit("agreement_certificate_generated", "SigningCertificate", saved.id, {});
    revalidatePath(`/agreements/${agreementId}/certificate`);
    return { success: true, id: saved.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Clauses + risk + Q&A + reminders ------------------------------------

export async function runClauseExtraction(agreementId: string) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!ag) return { success: false, error: "Not found" };
    const clauses = extractClauses(ag.content || "");
    await prisma.agreementClause.deleteMany({ where: { agreementId } });
    for (const c of clauses) await prisma.agreementClause.create({ data: { agreementId, kind: c.kind, value: c.value, confidence: c.confidence } });
    await logAudit("agreement_clauses_extracted", "Agreement", agreementId, { count: clauses.length });
    revalidatePath(`/agreements/${agreementId}`);
    revalidatePath(`/agreements/${agreementId}/qa`);
    return { success: true, count: clauses.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function runRiskScoring(agreementId: string) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { recipients: true, fields: true, clauses: true } });
    if (!ag) return { success: false, error: "Not found" };
    const findings = scoreAgreementRisks({
      content: ag.content || "",
      clauses: ag.clauses.map((c) => ({ kind: c.kind, value: c.value, confidence: c.confidence })),
      recipients: ag.recipients.map((r) => ({ id: r.id, name: r.name, routingOrder: r.routingOrder, required: r.required, status: r.status as RecipientDef["status"] })),
      fields: ag.fields.map((f) => ({ id: f.id, type: f.type as FieldType, recipientId: f.recipientId, required: f.required, value: f.value })),
      now: Date.now(),
    });
    await prisma.agreementRisk.deleteMany({ where: { agreementId, resolved: false } });
    for (const f of findings) await prisma.agreementRisk.create({ data: { agreementId, kind: f.kind, level: f.level, detail: f.detail } });
    await logAudit("agreement_risks_scored", "Agreement", agreementId, { count: findings.length });
    revalidatePath(`/agreements/${agreementId}/risks`);
    return { success: true, count: findings.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function askAgreement(agreementId: string, question: string) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { clauses: true } });
    if (!ag) return { success: false, error: "Not found" };
    const result = answerAgreementQuestion(question, ag.content || "", ag.clauses.map((c) => ({ kind: c.kind, value: c.value, confidence: c.confidence })));
    await audit(agreementId, "qa_asked", "owner", question.slice(0, 80));
    return { success: true, ...result };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function createReminder(agreementId: string, input: { kind?: string; days?: number }) {
  try {
    const ag = await prisma.agreement.findUnique({ where: { id: agreementId }, include: { recipients: { where: { status: { notIn: ["signed", "skipped"] } } } } });
    if (!ag) return { success: false, error: "Not found" };
    const days = input.days ?? 3;
    const dueAt = new Date(Date.now() + days * 86_400_000);
    const names = ag.recipients.map((r) => r.name).join(", ") || "the recipient";
    const draftSubject = `Reminder: please review "${ag.title}"`;
    const draftBody = `Hi ${names},\n\nA friendly reminder to review and sign "${ag.title}" at your convenience.\n\n— Local draft created by Personal Assist OS. NOT sent. This is a local agreement workflow, not legal advice.`;
    await prisma.agreementReminder.create({ data: { agreementId, kind: input.kind || "signing", dueAt, draftSubject, draftBody, status: "drafted" } });
    await audit(agreementId, "reminder_drafted", "owner");
    revalidatePath(`/agreements/${agreementId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

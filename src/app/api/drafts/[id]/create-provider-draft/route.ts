import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMetadata, stringifyMetadata } from "@/lib/metadata";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import * as gmailDraft from "@/lib/integrations/gmailDraft";
import * as outlookDraft from "@/lib/integrations/outlookDraft";

export const dynamic = "force-dynamic";

type ProviderValue = "gmail_draft" | "outlook_draft";

const PROVIDER_CONFIG: Record<
  ProviderValue,
  { key: "gmail" | "outlook"; label: string }
> = {
  gmail_draft: { key: "gmail", label: "Gmail" },
  outlook_draft: { key: "outlook", label: "Outlook" },
};

async function notify(
  title: string,
  message: string,
  severity: string,
  draftId: string
) {
  try {
    await prisma.notification.create({
      data: {
        title,
        message,
        type: "provider_draft",
        severity,
        status: "unread",
        relatedEntityType: "EmailDraft",
        relatedEntityId: draftId,
      },
    });
  } catch (e) {
    console.error("Failed to create provider draft notification", e);
  }
}

/**
 * Returns a valid (refreshed if necessary) access token for the draft connector.
 * Refreshes when the stored token expires within 60s. Never logs token values.
 */
async function getValidAccessToken(account: any, provider: ProviderValue): Promise<string> {
  const accessToken = account.accessTokenEncrypted
    ? decryptToken(account.accessTokenEncrypted)
    : "";

  const expiry = account.tokenExpiry ? new Date(account.tokenExpiry).getTime() : 0;
  const needsRefresh = !accessToken || expiry < Date.now() + 60_000;

  if (!needsRefresh) return accessToken;

  if (!account.refreshTokenEncrypted) {
    throw new Error("Token expired and no refresh token is available. Reconnect the connector.");
  }

  const refreshToken = decryptToken(account.refreshTokenEncrypted);
  const lib = provider === "gmail_draft" ? gmailDraft : outlookDraft;
  const refreshed = await lib.refreshAccessToken(refreshToken);

  const newExpiry = new Date();
  if (refreshed.expires_in) {
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshed.expires_in);
  }

  await prisma.connectorAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      ...(refreshed.refresh_token && {
        refreshTokenEncrypted: encryptToken(refreshed.refresh_token),
      }),
      tokenExpiry: newExpiry,
      status: "connected",
      lastError: null,
    },
  });

  return refreshed.access_token;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let draftId = "";
  try {
    const resolved = await params;
    draftId = resolved.id;

    const body = await request.json().catch(() => ({}));
    const provider = body?.provider as ProviderValue;

    // 0. Validate provider value.
    if (provider !== "gmail_draft" && provider !== "outlook_draft") {
      return NextResponse.json(
        { error: "Invalid provider. Use gmail_draft or outlook_draft." },
        { status: 400 }
      );
    }
    const { key: providerKey, label } = PROVIDER_CONFIG[provider];

    // 1-2. Load and verify the draft exists.
    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // 3. Verify the draft is approved (human-in-the-loop gate).
    if (draft.status !== "approved") {
      return NextResponse.json(
        { error: "Draft must be approved before a provider draft can be created." },
        { status: 400 }
      );
    }

    // Validate required content (no empty subject/body/recipients).
    if (!draft.to || !draft.to.trim()) {
      return NextResponse.json({ error: "Draft is missing recipients." }, { status: 400 });
    }
    if (!draft.subject || !draft.subject.trim()) {
      return NextResponse.json({ error: "Draft is missing a subject." }, { status: 400 });
    }
    if (!draft.body || !draft.body.trim()) {
      return NextResponse.json({ error: "Draft is missing a body." }, { status: 400 });
    }

    const meta = parseMetadata(draft.metadata);
    const providerDrafts = meta.providerDrafts || {};

    // 6. Block duplicate provider draft creation.
    if (providerDrafts[providerKey]) {
      await logAudit("provider_draft_duplicate_blocked", "EmailDraft", draftId, { provider });
      await notify(
        "Provider draft already exists",
        `A ${label} draft already exists for "${draft.subject}". Duplicate creation was blocked.`,
        "warning",
        draftId
      );
      return NextResponse.json(
        { error: `A ${label} draft already exists for this draft.`, alreadyExists: true },
        { status: 409 }
      );
    }

    // 4-5. Verify the provider connector exists and is connected.
    const account = await prisma.connectorAccount.findFirst({ where: { provider } });
    if (!account) {
      return NextResponse.json(
        { error: `${label} Draft connector is not configured. Connect it in Settings.` },
        { status: 400 }
      );
    }
    if (account.status !== "connected") {
      return NextResponse.json(
        { error: `${label} Draft connector is not connected. Reconnect it in Settings.` },
        { status: 400 }
      );
    }

    await logAudit("provider_draft_creation_started", "EmailDraft", draftId, { provider });

    // 7. Refresh token if needed.
    const accessToken = await getValidAccessToken(account, provider);

    // 8. Create the provider-side draft (never sends).
    const fields = {
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
    };

    let providerDraftRecord: Record<string, any>;
    if (provider === "gmail_draft") {
      const result = await gmailDraft.createGmailDraft(accessToken, fields);
      providerDraftRecord = {
        draftId: result.draftId,
        messageId: result.messageId,
        createdAt: new Date().toISOString(),
        status: "created",
      };
      await logAudit("gmail_provider_draft_created", "EmailDraft", draftId, {
        gmailDraftId: result.draftId,
      });
    } else {
      const result = await outlookDraft.createOutlookDraft(accessToken, fields);
      providerDraftRecord = {
        messageId: result.messageId,
        webLink: result.webLink,
        createdAt: new Date().toISOString(),
        status: "created",
      };
      await logAudit("outlook_provider_draft_created", "EmailDraft", draftId, {
        outlookMessageId: result.messageId,
      });
    }

    // 9. Store provider draft metadata on the EmailDraft.
    const updatedMeta = {
      ...meta,
      providerDrafts: { ...providerDrafts, [providerKey]: providerDraftRecord },
      providerDraftStatus: "created",
      providerDraftCreatedAt: providerDraftRecord.createdAt,
      providerDraftProvider: provider,
      pushedToProvider: true,
    };

    await prisma.emailDraft.update({
      where: { id: draftId },
      data: { metadata: stringifyMetadata(updatedMeta) },
    });

    // 11. Notify.
    await notify(
      `${label} draft created`,
      `A draft for "${draft.subject}" was created in your ${label} account. Review and send it manually from ${label}.`,
      "success",
      draftId
    );

    // 12. Return safe provider draft metadata only (no tokens).
    return NextResponse.json({
      success: true,
      provider,
      providerDraft: providerDraftRecord,
      message: `${label} draft created. Personal Assist does not send emails — review and send it manually from ${label}.`,
    });
  } catch (error: any) {
    console.error("Provider draft creation failed", error?.message);
    await logAudit("provider_draft_creation_failed", "EmailDraft", draftId || "unknown", {
      error: error?.message,
    });
    if (draftId) {
      await notify(
        "Provider draft creation failed",
        `Could not create the provider draft: ${error?.message || "Unknown error"}.`,
        "error",
        draftId
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to create provider draft." },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { decryptToken, encryptToken } from "@/lib/integrations/crypto";
import { refreshAccessToken, fetchInboxMessages, fetchMessageDetails, parseOutlookMessage } from "@/lib/integrations/outlookMail";
import { getAIProvider } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limit = body.limit ? parseInt(body.limit) : 10;

    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "outlook_mail" }
    });

    if (!account || !account.accessTokenEncrypted) {
      return NextResponse.json({ error: "Outlook Mail not connected" }, { status: 400 });
    }

    await logAudit("outlook_mail_sync_started", "ConnectorAccount", account.id, { limit });

    let accessToken = decryptToken(account.accessTokenEncrypted);
    let isExpired = false;
    if (account.lastSyncAt) {
      // Very basic expiry check. In production, we'd store exact expiry time.
      const msSinceSync = Date.now() - new Date(account.lastSyncAt).getTime();
      if (msSinceSync > 1000 * 60 * 50) { // 50 mins
        isExpired = true;
      }
    }

    if (isExpired && account.refreshTokenEncrypted) {
      try {
        const refreshToken = decryptToken(account.refreshTokenEncrypted);
        const tokenData = await refreshAccessToken(refreshToken);
        accessToken = tokenData.access_token;
        
        await prisma.connectorAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: encryptToken(accessToken),
            refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : account.refreshTokenEncrypted
          }
        });
      } catch (err: any) {
        await prisma.connectorAccount.update({
          where: { id: account.id },
          data: { status: "error", lastError: "Token refresh failed" }
        });
        await logAudit("outlook_mail_sync_failed", "ConnectorAccount", account.id, { error: "Token refresh failed" });
        return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
      }
    }

    const messages = await fetchInboxMessages(accessToken, limit);
    const aiProvider = await getAIProvider();

    let imported = 0;
    let skipped = 0;

    for (const msg of messages) {
      const externalId = `outlook_mail:${msg.id}`;

      const existing = await prisma.inboxItem.findUnique({
        where: { externalId }
      });

      if (existing) {
        skipped++;
        await logAudit("outlook_mail_email_skipped_duplicate", "InboxItem", existing.id, { messageId: msg.id });
        continue;
      }

      // If we don't have body text/html in the list view or want attachments, we could fetch details.
      // But the list view might have bodyPreview which is enough for the local AI text classification,
      // or we can just fetch the details to be thorough as requested.
      let details = null;
      try {
        details = await fetchMessageDetails(accessToken, msg.id);
      } catch (e) {
        console.warn(`Failed to fetch details for msg ${msg.id}, using list view data.`);
      }

      const parsed = await parseOutlookMessage(msg, details);

      // Upsert contact for sender
      if (parsed.sender) {
        await prisma.contact.create({
          data: {
            name: parsed.sender.name || "Unknown",
            email: parsed.sender.email,
            source: "outlook_mail",
            lastInteraction: parsed.receivedDateTime
          }
        });
      }

      // Upsert contacts for toRecipients and ccRecipients
      for (const rec of [...parsed.toRecipients, ...parsed.ccRecipients]) {
        await prisma.contact.create({
           data: {
             name: rec.name || "Unknown",
             email: rec.email,
             source: "outlook_mail",
             lastInteraction: parsed.receivedDateTime
           }
        });
      }

      const inboxItem = await prisma.inboxItem.create({
        data: {
          subject: parsed.subject,
          sender: parsed.sender ? `${parsed.sender.name} <${parsed.sender.email}>` : "Unknown",
          body: parsed.bodyText || parsed.bodyPreview,
          externalId: externalId
        }
      });

      imported++;
      await logAudit("outlook_mail_email_imported", "InboxItem", inboxItem.id, { messageId: parsed.id });

      // Run AI Classification Pipeline
      try {
        const textToAnalyze = `Subject: ${parsed.subject}\n\n${parsed.bodyText || parsed.bodyPreview}`;
        const classification = await aiProvider.classifyText(textToAnalyze);
        const entities = await aiProvider.extractEntities(textToAnalyze);
        const followUps = await aiProvider.detectFollowUps(textToAnalyze);
        const summary = await aiProvider.summarizeDocument(textToAnalyze);

        const metadata = {
           provider: "outlook_mail",
           messageId: parsed.id,
           conversationId: parsed.conversationId,
           internetMessageId: parsed.internetMessageId,
           receivedDateTime: parsed.receivedDateTime,
           sentDateTime: parsed.sentDateTime,
           from: parsed.sender,
           to: parsed.toRecipients,
           cc: parsed.ccRecipients,
           importance: parsed.importance,
           isRead: parsed.isRead,
           hasAttachments: parsed.hasAttachments,
           webLink: parsed.webLink,
           attachmentsMeta: parsed.attachmentsMeta,
           bodySource: parsed.bodySource,
           category: classification.category,
           confidence: classification.confidence,
           extractedAmount: entities.amount,
           extractedDate: entities.date,
           summary: summary,
           suggestedAction: classification.nextAction
        };

        await prisma.inboxItem.update({
          where: { id: inboxItem.id },
          data: {
            category: classification.category,
            isProcessed: true,
            metadata: JSON.stringify(metadata)
          }
        });

        // Create WalletCard
        if (classification.category === "payment_due" || classification.category === "ticket_received" || classification.category === "travel_itinerary") {
          let cardType = "document";
          if (classification.category === "payment_due") cardType = "payment";
          if (classification.category === "ticket_received") cardType = "ticket";
          if (classification.category === "travel_itinerary") cardType = "travel";

          await prisma.walletCard.create({
            data: {
              type: cardType,
              title: parsed.subject,
              category: classification.category,
              status: "active",
              source: `inbox:${inboxItem.id}`,
              date: entities.date ? new Date(entities.date) : null,
              amount: entities.amount,
              aiSummary: summary,
              nextAction: classification.nextAction
            }
          });
        }

        // Create FollowUp
        if (followUps.detected) {
          await prisma.followUp.create({
            data: {
              title: classification.nextAction || "Follow up on email",
              source: "email",
              status: "pending",
              reason: followUps.reason || summary,
              priority: "medium",
              dueDate: followUps.dueDate ? new Date(followUps.dueDate) : null
            }
          });
        }

      } catch (aiError) {
        console.error("AI Classification failed for Outlook email", aiError);
      }
    }

    await prisma.connectorAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastError: null, status: "connected" }
    });

    await prisma.notification.create({
      data: {
        title: "Outlook Mail Sync Completed",
        message: `Imported ${imported} new emails. Skipped ${skipped} duplicates.`,
        type: "system",
        severity: "info",
        status: "unread"
      }
    });

    await logAudit("outlook_mail_sync_completed", "ConnectorAccount", account.id, { imported, skipped });

    return NextResponse.json({ success: true, imported, skipped });
  } catch (error: any) {
    console.error("Outlook Mail sync error", error);
    
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "outlook_mail" }
    });
    if (account) {
      await prisma.connectorAccount.update({
        where: { id: account.id },
        data: { lastError: error.message, status: "error" }
      });
      await logAudit("outlook_mail_sync_failed", "ConnectorAccount", account.id, { error: error.message });
      
      await prisma.notification.create({
        data: {
          title: "Outlook Mail Sync Failed",
          message: error.message,
          type: "system",
          severity: "error",
          status: "unread"
        }
      });
    }

    return NextResponse.json({ error: "Failed to sync Outlook Mail" }, { status: 500 });
  }
}

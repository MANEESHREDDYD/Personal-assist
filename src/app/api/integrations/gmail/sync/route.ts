import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { decryptToken, encryptToken, refreshAccessToken, fetchRecentMessages, parseGmailMessage } from "@/lib/integrations/gmail";
import { getAIProvider } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const limit = body.limit ? parseInt(body.limit) : 10;

    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail" }
    });

    if (!account || !account.accessTokenEncrypted) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    await logAudit("gmail_sync_started", "ConnectorAccount", account.id, { limit });

    let accessToken = decryptToken(account.accessTokenEncrypted);
    let isExpired = false;
    if (account.tokenExpiry && new Date() > account.tokenExpiry) {
      isExpired = true;
    }

    if (isExpired && account.refreshTokenEncrypted) {
      try {
        const refreshToken = decryptToken(account.refreshTokenEncrypted);
        const tokenData = await refreshAccessToken(refreshToken);
        accessToken = tokenData.access_token;
        const expiry = new Date();
        expiry.setSeconds(expiry.getSeconds() + tokenData.expires_in);

        await prisma.connectorAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: encryptToken(accessToken),
            tokenExpiry: expiry
          }
        });
      } catch (err: any) {
        await prisma.connectorAccount.update({
          where: { id: account.id },
          data: { status: "error", lastError: "Token refresh failed" }
        });
        await logAudit("gmail_sync_failed", "ConnectorAccount", account.id, { error: "Token refresh failed" });
        return NextResponse.json({ error: "Token refresh failed. Please reconnect." }, { status: 401 });
      }
    }

    const messages = await fetchRecentMessages(accessToken, limit);
    const aiProvider = await getAIProvider();

    let imported = 0;
    let skipped = 0;

    for (const msg of messages) {
      const parsed = parseGmailMessage(msg);
      const externalId = `gmail:${parsed.id}`;

      const existing = await prisma.inboxItem.findUnique({
        where: { externalId }
      });

      if (existing) {
        skipped++;
        await logAudit("gmail_email_skipped_duplicate", "InboxItem", existing.id, { gmailId: parsed.id });
        continue;
      }

      // Upsert contact
      const contactMatches = parsed.from.match(/(.*?)<(.+?)>/);
      const contactName = contactMatches ? contactMatches[1].trim() : parsed.from;
      const contactEmail = contactMatches ? contactMatches[2].trim() : parsed.from;

      await prisma.contact.create({
        data: {
          name: contactName || "Unknown",
          email: contactEmail,
          source: "gmail",
          lastInteraction: new Date(parsed.date)
        }
      });

      const inboxItem = await prisma.inboxItem.create({
        data: {
          subject: parsed.subject,
          sender: parsed.from,
          body: parsed.body,
          externalId: externalId
        }
      });

      imported++;
      await logAudit("gmail_email_imported", "InboxItem", inboxItem.id, { gmailId: parsed.id });

      // Run AI Classification Pipeline
      try {
        const classification = await aiProvider.classifyText(`Subject: ${parsed.subject}\n\n${parsed.body}`);
        const entities = await aiProvider.extractEntities(`Subject: ${parsed.subject}\n\n${parsed.body}`);
        const followUps = await aiProvider.detectFollowUps(`Subject: ${parsed.subject}\n\n${parsed.body}`);
        
        const summary = await aiProvider.summarizeDocument(`Subject: ${parsed.subject}\n\n${parsed.body}`);

        const metadata = {
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
        console.error("AI Classification failed for imported email", aiError);
      }
    }

    await prisma.connectorAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), lastError: null, status: "connected" }
    });

    await prisma.notification.create({
      data: {
        title: "Gmail Sync Completed",
        message: `Imported ${imported} new emails. Skipped ${skipped} duplicates.`,
        type: "system",
        severity: "info",
        status: "unread"
      }
    });

    await logAudit("gmail_sync_completed", "ConnectorAccount", account.id, { imported, skipped });

    return NextResponse.json({ success: true, imported, skipped });
  } catch (error: any) {
    console.error("Gmail sync error", error);
    
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail" }
    });
    if (account) {
      await prisma.connectorAccount.update({
        where: { id: account.id },
        data: { lastError: error.message, status: "error" }
      });
      await logAudit("gmail_sync_failed", "ConnectorAccount", account.id, { error: error.message });
      
      await prisma.notification.create({
        data: {
          title: "Gmail Sync Failed",
          message: error.message,
          type: "system",
          severity: "error",
          status: "unread"
        }
      });
    }

    return NextResponse.json({ error: "Failed to sync Gmail" }, { status: 500 });
  }
}

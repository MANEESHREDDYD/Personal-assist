"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";
import { simpleParser } from "mailparser";

export async function processMockEmail(formData: FormData) {
  try {
    const sender = formData.get("sender") as string;
    const subject = formData.get("subject") as string;
    const body = formData.get("body") as string;

    const ai = await getAIProvider();
    const textToAnalyze = (subject + " " + body);
    
    const classification = await ai.classifyText(textToAnalyze);
    let category = classification.category;
    let confidenceScore = classification.confidence;
    
    const extractedEntities = await ai.extractEntities(textToAnalyze);

    // Map AI category to WalletCard type
    let walletType = "task";
    const catLower = category.toLowerCase();
    if (catLower.includes("payment")) walletType = "payment";
    else if (catLower.includes("travel")) walletType = "travel";
    else if (catLower.includes("ticket")) walletType = "ticket";
    else if (catLower.includes("order")) walletType = "order";
    else if (catLower.includes("document")) walletType = "document";

    // Follow-Up Radar Detection
    const followUp = await ai.detectFollowUps(textToAnalyze);
    if (followUp.detected) {
      extractedEntities.followUpReason = followUp.reason || "Detected follow-up phrasing";
      // We could also create a Reminder here
      await prisma.reminder.create({
        data: {
          title: `Follow up on: ${subject}`,
          description: extractedEntities.followUpReason,
          status: "pending",
        }
      });
      await logAudit("followup_detected", "InboxItem", "email", { reason: extractedEntities.followUpReason });
    }

    const metadata = JSON.stringify({ confidenceScore, extractedEntities });

    const inboxItem = await prisma.inboxItem.create({
      data: {
        sender,
        subject,
        body,
        category,
        isProcessed: true,
        metadata,
      },
    });

    const card = await prisma.walletCard.create({
      data: {
        type: walletType,
        title: subject,
        category: category,
        status: "Needs Attention",
        source: sender,
        metadata: JSON.stringify({ emailId: inboxItem.id, ...extractedEntities }),
        aiSummary: "[Mock AI] Automatically extracted from email. Action may be required.",
      },
    });

    await logAudit("inbox_item_classified", "InboxItem", inboxItem.id, { category, confidenceScore });
    
    revalidatePath("/inbox");
    revalidatePath("/wallet");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to process email", error);
    return { success: false, error: "Failed to process email" };
  }
}

export async function correctInboxItem(inboxItemId: string, newCategory: string, newWalletType: string) {
  try {
    const item = await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { category: newCategory },
    });

    // Update related wallet cards
    const cards = await prisma.walletCard.findMany();
    const relatedCard = cards.find(c => c.metadata && c.metadata.includes(inboxItemId));
    
    if (relatedCard) {
      await prisma.walletCard.update({
        where: { id: relatedCard.id },
        data: { type: newWalletType, category: newCategory },
      });
    }

    await logAudit("inbox_classification_corrected", "InboxItem", inboxItemId, { newCategory });
    revalidatePath("/inbox");
    revalidatePath("/wallet");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to correct inbox item", error);
    return { success: false };
  }
}

export async function processEmlUpload(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file uploaded" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const parsed = await simpleParser(buffer);
    
    const sender = parsed.from?.text || "unknown@sender.com";
    const subject = parsed.subject || "No Subject";
    const body = parsed.text || "No Body";
    
    // Check for attachments
    let attachmentNotes = "";
    if (parsed.attachments && parsed.attachments.length > 0) {
      attachmentNotes = `\n[Attachments detected: ${parsed.attachments.map(a => a.filename).join(", ")}. Content extraction planned.]`;
    }

    // Reuse processMockEmail logic for now by passing a synthetic FormData
    const synthForm = new FormData();
    synthForm.append("sender", sender);
    synthForm.append("subject", subject);
    synthForm.append("body", body + attachmentNotes);
    
    const res = await processMockEmail(synthForm);
    if (res.success) {
      await logAudit("eml_imported", "InboxItem", "eml_upload", { filename: file.name });
    }
    return res;
  } catch (error) {
    console.error("Failed to process .eml file", error);
    return { success: false, error: "Failed to parse .eml file" };
  }
}

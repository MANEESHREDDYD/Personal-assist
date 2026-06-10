/**
 * create-demo-provider-draft-fixture.ts
 *
 * Creates a safe, sanitized local demo of the provider-draft attachment workflow
 * (Phase 3I) so it can be tested and demoed without any real email account.
 *
 * It seeds: a demo InboxItem, a demo Document (+ a tiny local demo attachment in
 * data/uploads), an approved demo EmailDraft with linked-document metadata, and a
 * matching approved ApprovalRequest. The draft also carries DEMO provider-draft
 * placeholders so the "Validate Attachments" dry-run can be demonstrated offline.
 *
 * Everything uses fake names/emails. No private data, no real provider calls, no
 * sending. The generated attachment lives in the gitignored data/uploads folder.
 * The script is idempotent — re-running updates the same demo records.
 *
 * Run: npm run demo:provider-draft-fixture
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const DEMO_INBOX_EXTERNAL_ID = "demo-phase3i-inbox";
const DEMO_DOC_NAME = "Demo-Invoice-Phase3I.txt";
const DEMO_DRAFT_SUBJECT = "[DEMO] Phase 3I Provider Draft";
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

async function main() {
  console.log("Creating Phase 3I demo provider-draft fixture (sanitized, local-only)...");

  // 1. Write a tiny, safe local demo attachment into the private vault.
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const demoFilename = "demo-phase3i-invoice.txt";
  const demoFilePath = path.join(UPLOADS_DIR, demoFilename);
  const demoContent =
    "DEMO INVOICE (sanitized)\n" +
    "========================\n" +
    "Vendor: Example Vendor LLC\n" +
    "Bill To: Alex Demo <alex.demo@example.com>\n" +
    "Amount: $42.00\n" +
    "Due: 2099-01-01\n\n" +
    "This is a fake demo document for the Personal Assist Phase 3I attachment demo.\n" +
    "It contains no private data and is safe to attach to a demo provider draft.\n";
  fs.writeFileSync(demoFilePath, demoContent, "utf-8");
  const demoSize = Buffer.byteLength(demoContent, "utf-8");
  console.log(`[+] Wrote demo attachment (${demoSize} bytes) to data/uploads/${demoFilename}`);

  // 2. Demo InboxItem (idempotent via unique externalId).
  const inbox = await prisma.inboxItem.upsert({
    where: { externalId: DEMO_INBOX_EXTERNAL_ID },
    update: {
      subject: "Invoice for your review (DEMO)",
      sender: "Example Vendor <billing@example.com>",
      category: "finance",
      isProcessed: true,
    },
    create: {
      externalId: DEMO_INBOX_EXTERNAL_ID,
      subject: "Invoice for your review (DEMO)",
      body: "Please find attached the invoice for this month. (Demo content — no private data.)",
      sender: "Example Vendor <billing@example.com>",
      category: "finance",
      isProcessed: true,
      metadata: JSON.stringify({ demoFixture: true }),
    },
  });
  console.log(`[+] Demo InboxItem: ${inbox.id}`);

  // 3. Demo Document (idempotent via stable originalName).
  let doc = await prisma.document.findFirst({ where: { originalName: DEMO_DOC_NAME } });
  const docData = {
    filename: demoFilename,
    originalName: DEMO_DOC_NAME,
    mimeType: "text/plain",
    size: demoSize,
    path: `data/uploads/${demoFilename}`,
    status: "completed",
    aiSummary: "Demo invoice from Example Vendor LLC for $42.00, due 2099-01-01.",
  };
  if (doc) {
    doc = await prisma.document.update({ where: { id: doc.id }, data: docData });
  } else {
    doc = await prisma.document.create({ data: docData });
  }
  console.log(`[+] Demo Document: ${doc.id}`);

  // 4. Demo EmailDraft (approved) with linked-document metadata + DEMO provider drafts.
  const now = new Date().toISOString();
  const draftMeta = {
    demoFixture: true,
    riskLevel: "low",
    sourceDocumentId: doc.id,
    attachedDocumentIds: [doc.id],
    // DEMO provider-draft placeholders so dry-run validation can be shown offline.
    // These are NOT real provider drafts; real creation requires live OAuth.
    providerDrafts: {
      gmail: { draftId: "demo-gmail-draft", messageId: "demo-gmail-msg", createdAt: now, status: "created", demo: true, attachments: [] },
      outlook: { messageId: "demo-outlook-msg", webLink: "", createdAt: now, status: "created", demo: true, attachments: [] },
    },
    providerDraftStatus: "created",
    pushedToProvider: true,
  };

  let draft = await prisma.emailDraft.findFirst({ where: { subject: DEMO_DRAFT_SUBJECT } });
  const draftData = {
    type: "document_send",
    to: "Alex Demo <alex.demo@example.com>",
    cc: "",
    subject: DEMO_DRAFT_SUBJECT,
    body:
      "Hi Alex,\n\nPlease find the attached demo invoice for your review.\n\n" +
      "(This is a Personal Assist demo draft — no real email is ever sent.)\n\nBest,\nDemo User",
    status: "approved",
    relatedDocId: doc.id,
    relatedInboxId: inbox.id,
    aiGenerated: true,
    metadata: JSON.stringify(draftMeta),
  };
  if (draft) {
    draft = await prisma.emailDraft.update({ where: { id: draft.id }, data: draftData });
  } else {
    draft = await prisma.emailDraft.create({ data: draftData });
  }
  console.log(`[+] Demo EmailDraft (approved): ${draft.id}`);

  // 5. Demo ApprovalRequest (approved), linked to the draft.
  const approvalDesc = `Demo approval for ${DEMO_DRAFT_SUBJECT}`;
  const existingApproval = await prisma.approvalRequest.findFirst({ where: { description: approvalDesc } });
  const approvalData = {
    actionType: "Create Provider Draft",
    description: approvalDesc,
    status: "approved",
    metadata: JSON.stringify({ demoFixture: true, draftId: draft.id, documentId: doc.id, riskLevel: "low" }),
  };
  if (existingApproval) {
    await prisma.approvalRequest.update({ where: { id: existingApproval.id }, data: approvalData });
  } else {
    await prisma.approvalRequest.create({ data: approvalData });
  }
  console.log(`[+] Demo ApprovalRequest (approved)`);

  console.log("\n✅ Demo fixture ready.");
  console.log("   Open /drafts and find the [DEMO] Phase 3I Provider Draft.");
  console.log("   Use 'Validate Attachments' (dry-run) to demo offline — no provider is contacted.");
  console.log("   Real attachment upload still requires a live Gmail/Outlook draft connector.");
}

main()
  .catch((e) => {
    console.error("Demo fixture failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

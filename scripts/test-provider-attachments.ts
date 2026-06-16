/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-provider-attachments.ts
 *
 * Local integration test harness for the provider attachment validation logic
 * (Phase 3I.2). It exercises the shared, side-effect-free validation module
 * against the local SQLite DB using deterministic, sanitized test data. It NEVER
 * contacts Gmail/Outlook, never uploads, and never sends email.
 *
 * Test records use the "[TEST-3I2]" marker and "test3i2-" filenames, and are
 * cleaned up before and after the run. Generated files live in the gitignored
 * data/uploads folder.
 *
 * Run: npm run test:provider-attachments   (exit 0 = all pass)
 */

import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { validateProviderAttachmentRequest } from "../src/lib/providerAttachments/validation";

const UPLOADS = path.join(process.cwd(), "data", "uploads");
const TAG = "[TEST-3I2]";
const FILE_PREFIX = "test3i2-";
const MAX = 3 * 1024 * 1024;

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function writeUpload(filename: string, sizeOrContent: number | string): string {
  if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
  const full = path.join(UPLOADS, filename);
  if (typeof sizeOrContent === "number") fs.writeFileSync(full, Buffer.alloc(sizeOrContent));
  else fs.writeFileSync(full, sizeOrContent, "utf-8");
  return filename;
}

async function createDoc(opts: {
  originalName: string;
  filename: string;
  size: number;
  mimeType?: string;
}) {
  return prisma.document.create({
    data: {
      filename: opts.filename,
      originalName: opts.originalName,
      mimeType: opts.mimeType || "text/plain",
      size: opts.size,
      path: `data/uploads/${opts.filename}`,
      status: "completed",
    },
  });
}

async function createDraft(opts: { subject: string; status: string; metadata: any }) {
  return prisma.emailDraft.create({
    data: {
      type: "document_send",
      to: "Test User <test.user@example.com>",
      subject: opts.subject,
      body: "Test body (sanitized).",
      status: opts.status,
      metadata: JSON.stringify(opts.metadata),
    },
  });
}

function gmailProviderDraft(attachments: any[] = []) {
  return { gmail: { draftId: "test-gmail-draft", status: "created", demo: true, attachments } };
}

async function cleanup() {
  await prisma.emailDraft.deleteMany({ where: { subject: { contains: TAG } } });
  await prisma.document.deleteMany({ where: { originalName: { startsWith: FILE_PREFIX } } });
  try {
    for (const f of fs.readdirSync(UPLOADS)) {
      if (f.startsWith(FILE_PREFIX)) fs.unlinkSync(path.join(UPLOADS, f));
    }
  } catch {
    // uploads dir may not exist yet
  }
}

async function statusOf(provider: "gmail_draft" | "outlook_draft", draftId: string, documentIds: string[]) {
  const vr = await validateProviderAttachmentRequest({ draftId, provider, documentIds });
  return vr;
}

async function main() {
  console.log("Provider Attachment Integration Test Harness (Phase 3I.2)");
  console.log("=".repeat(60));
  console.log("Local validation only — no Gmail/Outlook calls, no sending.\n");

  await cleanup();

  // Shared small, safe, present document.
  const okFile = writeUpload(`${FILE_PREFIX}ok.txt`, "Safe small demo attachment.\n");
  const okDoc = await createDoc({ originalName: `${FILE_PREFIX}ok.txt`, filename: okFile, size: 28 });

  // Large + over-limit docs use mocked DB sizes (size class is derived from the
  // Document.size field) backed by tiny real files — so we never write 150 MB.
  const largeFile = writeUpload(`${FILE_PREFIX}large.bin`, "placeholder for large doc\n");
  const largeDoc = await createDoc({
    originalName: `${FILE_PREFIX}large.bin`,
    filename: largeFile,
    size: 5 * 1024 * 1024, // 5 MB -> "large"
    mimeType: "application/octet-stream",
  });
  const hugeFile = writeUpload(`${FILE_PREFIX}huge.bin`, "placeholder for huge doc\n");
  const hugeDoc = await createDoc({
    originalName: `${FILE_PREFIX}huge.bin`,
    filename: hugeFile,
    size: 200 * 1024 * 1024, // 200 MB -> "too_large"
    mimeType: "application/octet-stream",
  });

  // A. Happy dry-run path.
  {
    const draft = await createDraft({
      subject: `${TAG} happy`,
      status: "approved",
      metadata: { attachedDocumentIds: [okDoc.id], providerDrafts: gmailProviderDraft() },
    });
    const before = (await prisma.emailDraft.findUnique({ where: { id: draft.id } }))!.metadata;
    const vr = await statusOf("gmail_draft", draft.id, [okDoc.id]);
    const ok = vr.outcomes.find((o) => o.documentId === okDoc.id);
    check("A happy dry-run validates as uploadable", vr.ok && ok?.status === "ok", `got ${ok?.status}`);
    const after = (await prisma.emailDraft.findUnique({ where: { id: draft.id } }))!.metadata;
    check("A happy dry-run does not mutate metadata", before === after);
  }

  // B. Duplicate blocked.
  {
    const draft = await createDraft({
      subject: `${TAG} duplicate`,
      status: "approved",
      metadata: {
        attachedDocumentIds: [okDoc.id],
        providerDrafts: gmailProviderDraft([{ documentId: okDoc.id, status: "attached" }]),
      },
    });
    const vr = await statusOf("gmail_draft", draft.id, [okDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === okDoc.id);
    check("B duplicate blocked (already_attached)", o?.status === "already_attached", `got ${o?.status}`);
  }

  // C. Missing file blocked (doc record exists, file absent).
  {
    const missingDoc = await createDoc({
      originalName: `${FILE_PREFIX}missing.txt`,
      filename: `${FILE_PREFIX}missing-not-written.txt`,
      size: 100,
    });
    const draft = await createDraft({
      subject: `${TAG} missing`,
      status: "approved",
      metadata: { attachedDocumentIds: [missingDoc.id], providerDrafts: gmailProviderDraft() },
    });
    const vr = await statusOf("gmail_draft", draft.id, [missingDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === missingDoc.id);
    check("C missing file blocked (missing_file)", o?.status === "missing_file", `got ${o?.status}`);
  }

  // D. Blocked extension (.js).
  {
    const jsFile = writeUpload(`${FILE_PREFIX}script.js`, "console.log('x')\n");
    const jsDoc = await createDoc({
      originalName: `${FILE_PREFIX}script.js`,
      filename: jsFile,
      size: 20,
      mimeType: "text/javascript",
    });
    const draft = await createDraft({
      subject: `${TAG} blocked-ext`,
      status: "approved",
      metadata: { attachedDocumentIds: [jsDoc.id], providerDrafts: gmailProviderDraft() },
    });
    const vr = await statusOf("gmail_draft", draft.id, [jsDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === jsDoc.id);
    check("D blocked extension (.js -> blocked_type)", o?.status === "blocked_type", `got ${o?.status}`);
  }

  // E. Just over the small limit (3 MB + 1 byte) on Outlook -> large/upload_session.
  //    Size class comes from Document.size, so no real 3 MB file is written.
  {
    const boundaryFile = writeUpload(`${FILE_PREFIX}boundary.bin`, "placeholder for boundary doc\n");
    const boundaryDoc = await createDoc({
      originalName: `${FILE_PREFIX}boundary.bin`,
      filename: boundaryFile,
      size: MAX + 1,
      mimeType: "application/octet-stream",
    });
    const draft = await createDraft({
      subject: `${TAG} boundary`,
      status: "approved",
      metadata: { attachedDocumentIds: [boundaryDoc.id], providerDrafts: { outlook: { messageId: "test-outlook-msg", status: "created", attachments: [] } } },
    });
    const vr = await statusOf("outlook_draft", draft.id, [boundaryDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === boundaryDoc.id);
    check(
      "E just over 3 MB on Outlook -> large/upload_session",
      o?.status === "ok" && o?.sizeClass === "large" && o?.uploadMode === "upload_session",
      `got status=${o?.status} class=${o?.sizeClass} mode=${o?.uploadMode}`
    );
  }

  // F. Pending/rejected draft blocked before upload.
  {
    const draft = await createDraft({
      subject: `${TAG} pending`,
      status: "draft",
      metadata: { attachedDocumentIds: [okDoc.id], providerDrafts: gmailProviderDraft() },
    });
    const vr = await statusOf("gmail_draft", draft.id, [okDoc.id]);
    check("F pending draft blocked (not_approved)", !vr.ok && vr.errorCode === "not_approved", `got ok=${vr.ok} code=${vr.errorCode}`);
  }

  // G. Provider draft metadata missing.
  {
    const draft = await createDraft({
      subject: `${TAG} no-provider-draft`,
      status: "approved",
      metadata: { attachedDocumentIds: [okDoc.id] },
    });
    const vr = await statusOf("gmail_draft", draft.id, [okDoc.id]);
    check("G provider draft missing blocked (provider_draft_missing)", !vr.ok && vr.errorCode === "provider_draft_missing", `got ok=${vr.ok} code=${vr.errorCode}`);
  }

  const outlookPd = { outlook: { messageId: "test-outlook-msg", status: "created", demo: true, attachments: [] as any[] } };

  // H. Outlook large file -> upload_session.
  {
    const draft = await createDraft({
      subject: `${TAG} outlook-large`,
      status: "approved",
      metadata: { attachedDocumentIds: [largeDoc.id], providerDrafts: outlookPd },
    });
    const vr = await statusOf("outlook_draft", draft.id, [largeDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === largeDoc.id);
    check(
      "H Outlook large -> upload_session",
      o?.status === "ok" && o?.sizeClass === "large" && o?.uploadMode === "upload_session",
      `got status=${o?.status} class=${o?.sizeClass} mode=${o?.uploadMode}`
    );
  }

  // I. Over 150 MB -> too_large.
  {
    const draft = await createDraft({
      subject: `${TAG} over-limit`,
      status: "approved",
      metadata: { attachedDocumentIds: [hugeDoc.id], providerDrafts: outlookPd },
    });
    const vr = await statusOf("outlook_draft", draft.id, [hugeDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === hugeDoc.id);
    check(
      "I over 150 MB -> too_large (blocked)",
      o?.status === "too_large" && o?.sizeClass === "too_large" && o?.uploadMode === "blocked",
      `got status=${o?.status} class=${o?.sizeClass} mode=${o?.uploadMode}`
    );
  }

  // J. Gmail large file -> deferred.
  {
    const draft = await createDraft({
      subject: `${TAG} gmail-large`,
      status: "approved",
      metadata: { attachedDocumentIds: [largeDoc.id], providerDrafts: gmailProviderDraft() },
    });
    const vr = await statusOf("gmail_draft", draft.id, [largeDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === largeDoc.id);
    check(
      "J Gmail large -> deferred",
      o?.status === "deferred" && o?.sizeClass === "large" && o?.uploadMode === "deferred",
      `got status=${o?.status} class=${o?.sizeClass} mode=${o?.uploadMode}`
    );
  }

  // K. Small file still -> simple.
  {
    const draft = await createDraft({
      subject: `${TAG} outlook-small`,
      status: "approved",
      metadata: { attachedDocumentIds: [okDoc.id], providerDrafts: outlookPd },
    });
    const vr = await statusOf("outlook_draft", draft.id, [okDoc.id]);
    const o = vr.outcomes.find((x) => x.documentId === okDoc.id);
    check(
      "K small file -> simple",
      o?.status === "ok" && o?.sizeClass === "small" && o?.uploadMode === "simple",
      `got status=${o?.status} class=${o?.sizeClass} mode=${o?.uploadMode}`
    );
  }

  await cleanup();

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("❌ Integration test FAILED.");
    process.exit(1);
  }
  console.log("✅ All provider attachment validation tests passed.");
  process.exit(0);
}

main()
  .catch(async (e) => {
    console.error("Test harness error:", e);
    try {
      await cleanup();
    } catch {
      // ignore cleanup errors during failure
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

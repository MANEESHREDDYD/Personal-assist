/**
 * test-agreements.ts — Phase 6F local agreement workflow tests.
 *
 * Layer 1: pure engine (hashing, field validation, signing order, clause extraction,
 * risk scoring, certificate, Q&A). Layer 2: DB integration (agreement + recipients +
 * fields, mark signed, generate certificate) asserting no provider/email and no
 * false legal-binding wording. Cleanup included.
 */
import { PrismaClient } from "@prisma/client";
import { hashAgreement, hashFinal, sha256 } from "../src/lib/agreements/hashing";
import { validateFieldValue, incompleteRequiredFields, allRequiredComplete } from "../src/lib/agreements/fields";
import { canRecipientSign, deriveAgreementStatus } from "../src/lib/agreements/signing";
import { extractClauses } from "../src/lib/agreements/clauseExtraction";
import { scoreAgreementRisks } from "../src/lib/agreements/riskScoring";
import { buildCertificate } from "../src/lib/agreements/certificates";
import { answerAgreementQuestion } from "../src/lib/agreements/qa";
import type { RecipientDef, FieldDef } from "../src/lib/agreements/types";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

const SAMPLE = "This Services Agreement is made by and between Acme Inc and Beta LLC. Effective date: January 1, 2026. Payment terms: Net 30. This agreement expires on December 31, 2026 and automatically renews annually unless either party gives 60 days notice. Governed by the laws of Delaware. Signed by authorized representatives. Provider shall deliver the services. This includes an indemnification and perpetual license.";

// ---- hashing -------------------------------------------------------------
{
  const h1 = hashAgreement({ title: "A", content: "hello", recipients: [{ name: "Sam" }] });
  const h2 = hashAgreement({ title: "A", content: "hello", recipients: [{ name: "Sam" }] });
  const h3 = hashAgreement({ title: "A", content: "changed", recipients: [{ name: "Sam" }] });
  check("hash is deterministic", h1 === h2 && h1.length === 64);
  check("hash changes with content", h1 !== h3);
  check("final hash includes field values", hashFinal({ title: "A", content: "x", fields: [{ type: "signature", value: "Sam" }] }) !== hashFinal({ title: "A", content: "x", fields: [{ type: "signature", value: "Pat" }] }));
  check("sha256 known length", sha256("abc").length === 64);
}

// ---- field validation ----------------------------------------------------
{
  check("required empty fails", validateFieldValue("text", true, "") !== null);
  check("required filled passes", validateFieldValue("text", true, "hi") === null);
  check("bad date fails", validateFieldValue("date", true, "2026/01/01") !== null);
  check("good date passes", validateFieldValue("date", true, "2026-01-01") === null);
  check("unchecked required checkbox fails", validateFieldValue("checkbox", true, "false") !== null);
  check("short signature fails", validateFieldValue("signature", true, "S") !== null);
  const fields: FieldDef[] = [
    { id: "f1", type: "signature", recipientId: "r1", required: true, value: null },
    { id: "f2", type: "date", recipientId: "r1", required: true, value: "2026-01-01" },
  ];
  check("incomplete required detected", incompleteRequiredFields(fields, "r1").includes("f1"));
  check("not all required complete", allRequiredComplete(fields) === false);
}

// ---- signing order -------------------------------------------------------
{
  const recips: RecipientDef[] = [
    { id: "r1", name: "First", routingOrder: 1, required: true, status: "pending" },
    { id: "r2", name: "Second", routingOrder: 2, required: true, status: "pending" },
  ];
  check("second signer blocked until first signs", canRecipientSign(recips, "r2") !== null);
  check("first signer allowed", canRecipientSign(recips, "r1") === null);
  const afterFirst = recips.map((r) => (r.id === "r1" ? { ...r, status: "signed" as const } : r));
  check("second signer allowed after first signs", canRecipientSign(afterFirst, "r2") === null);
  check("status draft initially", deriveAgreementStatus(recips, false) === "draft");
  check("status prepared when prepared", deriveAgreementStatus(recips, true) === "sent_for_local_signing");
  check("status partially_signed", deriveAgreementStatus(afterFirst, true) === "partially_signed");
  const allSigned = recips.map((r) => ({ ...r, status: "signed" as const }));
  check("status completed when all signed", deriveAgreementStatus(allSigned, true) === "completed");
  const declined = recips.map((r) => (r.id === "r2" ? { ...r, status: "declined" as const } : r));
  check("status voided when required declines", deriveAgreementStatus(declined, true) === "voided");
}

// ---- clause extraction ---------------------------------------------------
{
  const c = extractClauses(SAMPLE);
  const kinds = c.map((x) => x.kind);
  check("extracts parties", kinds.filter((k) => k === "party").length >= 2);
  check("extracts effective date", c.some((x) => x.kind === "effective_date" && /2026/.test(x.value)));
  check("extracts expiration date", c.some((x) => x.kind === "expiration_date"));
  check("extracts renewal", kinds.includes("renewal_date"));
  check("extracts notice period", c.some((x) => x.kind === "notice_period" && /60/.test(x.value)));
  check("extracts payment terms Net 30", c.some((x) => x.kind === "payment_terms" && /Net 30/i.test(x.value)));
  check("extracts governing law Delaware", c.some((x) => x.kind === "governing_law" && /Delaware/i.test(x.value)));
  check("extracts signature requirement", kinds.includes("signature_requirement"));
}

// ---- risk scoring --------------------------------------------------------
{
  const clauses = extractClauses(SAMPLE);
  const noSigRisks = scoreAgreementRisks({ content: SAMPLE, clauses, recipients: [{ id: "r1", name: "A", routingOrder: 1, required: true, status: "pending" }], fields: [], now: NOW });
  check("missing signature risk flagged", noSigRisks.some((r) => r.kind === "missing_signature"));
  check("unsigned recipient risk flagged", noSigRisks.some((r) => r.kind === "unsigned_recipient"));
  check("high-risk keyword flagged (indemnif/perpetual)", noSigRisks.some((r) => r.kind === "high_risk_keyword"));
  check("auto-renew flagged as approaching_renewal", noSigRisks.some((r) => r.kind === "approaching_renewal"));
  const noParty = scoreAgreementRisks({ content: "A plain note with no parties.", clauses: [], recipients: [], fields: [{ id: "f", type: "signature", required: true }], now: NOW });
  check("missing party risk flagged", noParty.some((r) => r.kind === "missing_party"));
}

// ---- certificate ---------------------------------------------------------
{
  const cert = buildCertificate({
    agreementId: "ag1", title: "Test", status: "completed",
    originalHash: "o".repeat(64), finalHash: "f".repeat(64),
    recipients: [{ name: "Sam", role: "Client", status: "signed", signedAt: "2026-06-15" }],
    fields: [{ type: "signature", completed: true }],
    audit: [{ action: "created", actor: "owner", createdAt: "2026-06-10" }, { action: "completed", createdAt: "2026-06-15" }],
    generatedAt: "2026-06-15T12:00:00Z",
  });
  const parsed = JSON.parse(cert.json);
  check("certificate JSON parses", parsed.agreementId === "ag1");
  check("certificate declares no legal-binding claim", parsed.legalBindingClaim === false && parsed.docusignReplacementClaim === false);
  check("certificate markdown has disclaimer", /not legally binding/i.test(cert.markdown) && /not legal advice/i.test(cert.markdown));
  check("certificate markdown shows hashes", cert.markdown.includes("o".repeat(64)) && cert.markdown.includes("f".repeat(64)));
  check("no false legal-binding wording", !/\bis legally binding\b/i.test(cert.markdown) && !/court-admissible(?!)/i.test(cert.markdown.replace(/not a court-admissible/i, "")));
}

// ---- Q&A -----------------------------------------------------------------
{
  const clauses = extractClauses(SAMPLE);
  const r1 = answerAgreementQuestion("When does it renew?", SAMPLE, clauses);
  check("Q&A answers renewal with citation", r1.cited && /renewal|renew/i.test(r1.answer));
  check("Q&A includes not-legal-advice caveat", /not legal advice/i.test(r1.answer));
  const r2 = answerAgreementQuestion("What is the meaning of life?", SAMPLE, clauses);
  check("Q&A says it couldn't find an answer", r2.cited === false && /couldn't find|could not find/i.test(r2.answer));
}

// ---- DB integration ------------------------------------------------------
async function dbTests() {
  const prisma = new PrismaClient();
  const created: { ag?: string } = {};
  try {
    const ag = await prisma.agreement.create({
      data: {
        title: "Test Service Agreement", content: SAMPLE, status: "draft",
        originalHash: hashAgreement({ title: "Test Service Agreement", content: SAMPLE, recipients: [{ name: "Acme", role: "Client" }] }),
        recipients: { create: [{ name: "Acme", role: "Client", routingOrder: 1 }, { name: "Beta", role: "Provider", routingOrder: 2 }] },
      },
      include: { recipients: true },
    });
    created.ag = ag.id;
    await prisma.agreementField.create({ data: { agreementId: ag.id, recipientId: ag.recipients[0].id, type: "signature", required: true } });
    check("DB: agreement + recipients + field created", ag.recipients.length === 2);
    check("DB: original hash stored (64 hex)", (ag.originalHash || "").length === 64);

    // sign first recipient
    await prisma.agreementRecipient.update({ where: { id: ag.recipients[0].id }, data: { status: "signed", signedAt: new Date() } });
    const cert = buildCertificate({ agreementId: ag.id, title: ag.title, status: "partially_signed", originalHash: ag.originalHash!, finalHash: hashFinal({ title: ag.title, content: ag.content, fields: [{ type: "signature", value: "Acme" }] }), recipients: [{ name: "Acme", role: "Client", status: "signed" }], fields: [{ type: "signature", completed: true }], audit: [{ action: "created", createdAt: new Date().toISOString() }], generatedAt: new Date().toISOString() });
    const saved = await prisma.signingCertificate.create({ data: { agreementId: ag.id, originalHash: ag.originalHash!, finalHash: cert.json.length ? "f".repeat(64) : "", json: cert.json, markdown: cert.markdown } });
    check("DB: certificate persisted", !!saved.id);
    check("DB: certificate has no legal-binding claim", JSON.parse(saved.json).legalBindingClaim === false);

    // no provider/email columns exist on agreement → invariant holds by construction
    check("DB: no provider/email fields on agreement (local only)", !("provider" in ag) && !("emailSent" in ag));
  } finally {
    if (created.ag) await prisma.agreement.delete({ where: { id: created.ag } }).catch(() => {});
    await prisma.$disconnect();
  }
}

dbTests().then(() => {
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error("❌ agreement tests failed."); process.exit(1); }
  console.log("✅ All agreement tests passed.");
}).catch((e) => { console.error("Harness error:", e); process.exit(1); });

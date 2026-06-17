/**
 * Signing certificate generation (Phase 6F). Pure + testable.
 * Local audit artifact — NOT legally binding, NOT a DocuSign replacement.
 */

import { LOCAL_DISCLAIMER, type AuditEventLite } from "./types";

export interface CertificateInput {
  agreementId: string;
  title: string;
  status: string;
  originalHash: string;
  finalHash: string;
  recipients: { name: string; role?: string | null; status: string; signedAt?: string | null }[];
  fields: { type: string; label?: string | null; completed: boolean }[];
  audit: AuditEventLite[];
  generatedAt: string;
}

export interface Certificate {
  json: string;
  markdown: string;
}

export function buildCertificate(input: CertificateInput): Certificate {
  const completedFields = input.fields.filter((f) => f.completed).length;
  const payload = {
    disclaimer: LOCAL_DISCLAIMER,
    agreementId: input.agreementId,
    title: input.title,
    status: input.status,
    hashes: { original: input.originalHash, final: input.finalHash, algorithm: "sha256" },
    recipients: input.recipients,
    fieldCompletion: { completed: completedFields, total: input.fields.length },
    auditTimeline: input.audit,
    generatedAt: input.generatedAt,
    legalBindingClaim: false,
    docusignReplacementClaim: false,
  };
  const json = JSON.stringify(payload, null, 2);

  const recipientLines = input.recipients.map((r) => `- **${r.name}**${r.role ? ` (${r.role})` : ""} — ${r.status}${r.signedAt ? ` at ${r.signedAt}` : ""}`).join("\n");
  const auditLines = input.audit.map((e) => `- ${e.createdAt} — **${e.action}**${e.actor ? ` by ${e.actor}` : ""}${e.detail ? ` (${e.detail})` : ""}`).join("\n");

  const markdown = [
    `# Signing Certificate — ${input.title}`,
    "",
    `> ${LOCAL_DISCLAIMER}`,
    "",
    `**Agreement:** ${input.agreementId}  `,
    `**Status:** ${input.status}  `,
    `**Generated:** ${input.generatedAt}`,
    "",
    "## Hashes (SHA-256)",
    `- Original: \`${input.originalHash}\``,
    `- Final: \`${input.finalHash}\``,
    "",
    "## Recipients",
    recipientLines || "- (none)",
    "",
    `## Field completion: ${completedFields}/${input.fields.length}`,
    "",
    "## Audit timeline",
    auditLines || "- (no events)",
    "",
    "_This certificate records a local signing simulation. It is not legal advice and not a court-admissible or DocuSign-equivalent record._",
  ].join("\n");

  return { json, markdown };
}

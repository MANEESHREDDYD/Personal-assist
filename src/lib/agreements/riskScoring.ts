/**
 * Heuristic agreement risk scoring (Phase 6F). Pure + testable.
 * Decision-support only — NOT legal advice.
 */

import type { ClauseFinding, RecipientDef, FieldDef, RiskFinding } from "./types";

const DAY = 86_400_000;
const HIGH_RISK_KEYWORDS = ["indemnif", "unlimited liability", "perpetual", "exclusive", "non-compete", "auto-renew", "automatically renew", "liquidated damages", "personal guarantee"];

export interface RiskInput {
  content: string;
  clauses: ClauseFinding[];
  recipients: RecipientDef[];
  fields: FieldDef[];
  now: number;
}

function parseDateMs(value: string): number | null {
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

export function scoreAgreementRisks(input: RiskInput): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const text = (input.content || "").toLowerCase();
  const has = (kind: string) => input.clauses.some((c) => c.kind === kind);

  // missing signature field
  const sigFields = input.fields.filter((f) => f.type === "signature");
  if (sigFields.length === 0) findings.push({ kind: "missing_signature", level: "high", detail: "No signature field has been placed." });

  // unsigned recipients
  const unsigned = input.recipients.filter((r) => r.required && r.status !== "signed" && r.status !== "skipped").length;
  if (unsigned > 0) findings.push({ kind: "unsigned_recipient", level: unsigned >= 2 ? "medium" : "low", detail: `${unsigned} required recipient(s) have not signed.` });

  // missing party
  if (!has("party")) findings.push({ kind: "missing_party", level: "medium", detail: "No clearly identified parties were detected." });

  // missing effective date
  if (!has("effective_date")) findings.push({ kind: "missing_effective_date", level: "low", detail: "No effective date detected." });

  // missing governing law
  if (!has("governing_law")) findings.push({ kind: "missing_governing_law", level: "low", detail: "No governing law detected." });

  // termination clause present (informational)
  if (has("termination_date")) findings.push({ kind: "termination_clause", level: "low", detail: "A termination clause is present — review terms." });

  // approaching renewal / expiration
  for (const c of input.clauses) {
    if (c.kind === "renewal_date" || c.kind === "expiration_date") {
      const ms = parseDateMs(c.value);
      if (ms != null) {
        const days = (ms - input.now) / DAY;
        if (days >= 0 && days <= 30) findings.push({ kind: c.kind === "renewal_date" ? "approaching_renewal" : "approaching_expiration", level: days <= 7 ? "high" : "medium", detail: `${c.kind.replace("_", " ")} in ${Math.ceil(days)} day(s).` });
      } else if (/auto/i.test(c.value)) {
        findings.push({ kind: "approaching_renewal", level: "medium", detail: "Agreement auto-renews — confirm the renewal/notice window." });
      }
    }
    if (c.kind === "notice_period") {
      const n = parseInt(c.value, 10);
      if (!Number.isNaN(n) && n >= 60) findings.push({ kind: "long_notice_period", level: "medium", detail: `Long notice period: ${c.value}.` });
    }
  }

  // high-risk keywords
  const hit = HIGH_RISK_KEYWORDS.filter((k) => text.includes(k));
  if (hit.length > 0) findings.push({ kind: "high_risk_keyword", level: hit.length >= 2 ? "high" : "medium", detail: `High-risk language detected: ${hit.join(", ")}.` });

  return findings;
}

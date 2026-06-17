/**
 * Deterministic clause / obligation / renewal extraction (Phase 6F). Pure + testable.
 * Heuristic extraction only — NOT legal advice. A local AI provider may refine this
 * later, but these rules are the always-available base.
 */

import type { ClauseFinding } from "./types";

const DATE_RE =
  /\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i;

function dateNear(text: string, keyword: RegExp): string | null {
  const m = text.match(keyword);
  if (!m) return null;
  const window = text.slice(m.index ?? 0, (m.index ?? 0) + 160);
  const d = window.match(DATE_RE);
  return d ? d[0] : null;
}

export function extractClauses(content: string): ClauseFinding[] {
  const text = content || "";
  const out: ClauseFinding[] = [];
  const push = (kind: string, value: string, confidence = 0.6) => out.push({ kind, value, confidence });

  // parties: "by and between X and Y"
  const parties = text.match(/(?:by and )?between\s+(.+?)\s+and\s+(.+?)(?:\.|,|;|\(|\n|$)/i);
  if (parties) { push("party", parties[1].trim(), 0.7); push("party", parties[2].trim(), 0.7); }

  // effective date
  const eff = dateNear(text, /effective(?:\s+(?:date|as of))?/i);
  if (eff) push("effective_date", eff, 0.7);

  // expiration
  const exp = dateNear(text, /expir(?:e|es|ation)/i);
  if (exp) push("expiration_date", exp, 0.7);

  // renewal
  if (/renew/i.test(text)) {
    const rdate = dateNear(text, /renew/i);
    push("renewal_date", rdate || (/automatically renew/i.test(text) ? "auto-renews" : "renewal mentioned"), rdate ? 0.7 : 0.5);
  }

  // termination
  if (/terminat/i.test(text)) {
    const tdate = dateNear(text, /terminat/i);
    push("termination_date", tdate || "termination clause present", tdate ? 0.65 : 0.5);
  }

  // notice period: "30 days notice", "60 days' prior written notice"
  const notice = text.match(/(\d+)\s*(day|days|month|months)['’\s]*(?:prior\s+)?(?:written\s+)?notice/i);
  if (notice) push("notice_period", `${notice[1]} ${notice[2]}`, 0.7);

  // payment terms: "Net 30", "due within 30 days", "$1,000"
  const net = text.match(/\bnet\s*(\d+)\b/i);
  if (net) push("payment_terms", `Net ${net[1]}`, 0.7);
  else {
    const due = text.match(/due\s+within\s+(\d+)\s+days/i);
    if (due) push("payment_terms", `Due within ${due[1]} days`, 0.65);
    const amt = text.match(/\$\s?[\d,]+(?:\.\d{2})?/);
    if (amt) push("payment_terms", `Amount ${amt[0]}`, 0.5);
  }

  // confidentiality
  if (/confidential|non-disclosure|\bnda\b/i.test(text)) push("confidentiality", "Confidentiality / NDA language present", 0.6);

  // governing law: "governed by the laws of X"
  const gov = text.match(/governed by the laws of\s+([A-Za-z .]+?)(?:\.|,|;|\n|$)/i);
  if (gov) push("governing_law", gov[1].trim(), 0.7);
  else if (/governing law/i.test(text)) push("governing_law", "Governing law mentioned", 0.5);

  // signature requirement
  if (/signature|signed by|executed by|in witness whereof/i.test(text)) push("signature_requirement", "Signature required", 0.6);

  // obligations: simple "shall" / "must" sentences (first 3)
  const obligations = text.split(/(?<=\.)\s+/).filter((s) => /\b(shall|must|agrees? to|is responsible for)\b/i.test(s)).slice(0, 3);
  for (const o of obligations) push("obligation", o.trim().slice(0, 140), 0.5);

  return out;
}

/**
 * Local agreement Q&A (Phase 6F). Pure + testable.
 *
 * Cautious, citation-based answers from the agreement text + extracted clauses.
 * NOT legal advice. If a source cannot be cited, it says so.
 */

import type { ClauseFinding } from "./types";

const NOT_LEGAL = "This is heuristic information from the document text, not legal advice.";

export interface QaResult {
  answer: string;
  cited: boolean;
  sourceKind?: string;
}

const CLAUSE_HINTS: { match: RegExp; kinds: string[]; label: string }[] = [
  { match: /renew/i, kinds: ["renewal_date"], label: "renewal" },
  { match: /expir|end date|terminat/i, kinds: ["expiration_date", "termination_date"], label: "expiration/termination" },
  { match: /effective|start date/i, kinds: ["effective_date"], label: "effective date" },
  { match: /pay|fee|cost|amount|invoice|net/i, kinds: ["payment_terms"], label: "payment terms" },
  { match: /notice/i, kinds: ["notice_period"], label: "notice period" },
  { match: /part(y|ies)|who.*sign|between/i, kinds: ["party"], label: "parties" },
  { match: /confidential|nda|disclos/i, kinds: ["confidentiality"], label: "confidentiality" },
  { match: /governing law|jurisdiction|law/i, kinds: ["governing_law"], label: "governing law" },
  { match: /obligation|responsib|shall|must/i, kinds: ["obligation"], label: "obligations" },
];

export function answerAgreementQuestion(question: string, content: string, clauses: ClauseFinding[]): QaResult {
  const q = question.trim();
  if (!q) return { answer: "Ask a question about this agreement.", cited: false };

  const hint = CLAUSE_HINTS.find((h) => h.match.test(q));
  if (hint) {
    const matches = clauses.filter((c) => hint.kinds.includes(c.kind));
    if (matches.length > 0) {
      const values = matches.map((c) => c.value).join("; ");
      return { answer: `Based on the extracted ${hint.label}: ${values}. ${NOT_LEGAL}`, cited: true, sourceKind: hint.kinds[0] };
    }
  }

  // fall back to a keyword sentence search in the content
  const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
  const sentences = (content || "").split(/(?<=\.)\s+/);
  const hit = sentences.find((s) => words.some((w) => s.toLowerCase().includes(w)));
  if (hit) return { answer: `The agreement says: "${hit.trim().slice(0, 220)}". ${NOT_LEGAL}`, cited: true, sourceKind: "content" };

  return { answer: `I couldn't find a clear answer in the agreement text for that question. ${NOT_LEGAL} Consider reviewing the full document or asking a qualified professional.`, cited: false };
}

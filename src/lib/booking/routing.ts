/** Deterministic booking routing engine (Phase 6B). Pure + testable. */

import type { RoutingRuleDef, BookingAnswers, RoutingResult } from "./types";

function matches(rule: RoutingRuleDef, answers: BookingAnswers): boolean {
  if (!rule.questionLabel) return true; // unconditional rule
  const raw = answers[rule.questionLabel];
  const answer = (raw == null ? "" : String(raw)).toLowerCase().trim();
  const value = (rule.value ?? "").toLowerCase().trim();
  switch (rule.op) {
    case "equals":
      return answer === value;
    case "not_equals":
      return answer !== value;
    case "contains":
      return value !== "" && answer.includes(value);
    default:
      return false;
  }
}

/**
 * Evaluates routing rules against answers. Highest priority first; first enabled
 * matching rule wins. Returns a default of null (unrouted) when nothing matches.
 */
export function evaluateRouting(
  rules: RoutingRuleDef[],
  answers: BookingAnswers
): RoutingResult {
  const ordered = [...rules]
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const rule of ordered) {
    if (matches(rule, answers)) {
      return {
        routedTo: rule.routeTo,
        reason: rule.questionLabel
          ? `Matched "${rule.label}": ${rule.questionLabel} ${rule.op} ${rule.value ?? ""}`
          : `Default route "${rule.label}"`,
      };
    }
  }
  return { routedTo: null, reason: null };
}

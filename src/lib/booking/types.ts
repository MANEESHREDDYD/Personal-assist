/** Shared booking types (Phase 6B). */

export type LocationType =
  | "google_meet"
  | "teams"
  | "zoom"
  | "phone"
  | "in_person"
  | "custom";

export const LOCATION_LABELS: Record<LocationType, string> = {
  google_meet: "Google Meet (link placeholder)",
  teams: "Microsoft Teams (link placeholder)",
  zoom: "Zoom (link placeholder)",
  phone: "Phone",
  in_person: "In person",
  custom: "Custom link / location",
};

export type QuestionType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "select"
  | "checkbox";

export interface BookingQuestionDef {
  id?: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  order?: number;
}

export interface RoutingRuleDef {
  id?: string;
  label: string;
  questionLabel?: string | null;
  op: "equals" | "contains" | "not_equals";
  value?: string | null;
  routeTo: string;
  priority?: number;
  enabled?: boolean;
}

export interface RoutingResult {
  routedTo: string | null;
  reason: string | null;
}

export interface BookingAnswers {
  [questionLabel: string]: string | boolean;
}

export interface QuestionValidationError {
  label: string;
  message: string;
}

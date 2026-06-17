/** Shared project-manager types (Phase 6E). */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskKind =
  | "deadline"
  | "overload"
  | "missing_owner"
  | "blocked_task"
  | "stale_status"
  | "dependency_bottleneck"
  | "too_many_high_priority"
  | "insufficient_time"
  | "approaching_due";

export interface DecomposedTask {
  title: string;
  estimateMins: number;
  priority: number; // 1..5
  dueOffsetDays: number; // days from project start
  /** index of a prerequisite task within the SAME decomposition (or -1). */
  dependsOnIndex?: number;
}

export interface DecomposedStage {
  name: string;
  tasks: DecomposedTask[];
}

export interface DecompositionResult {
  stages: DecomposedStage[];
  riskNotes: string[];
  brief: string;
  detectedTemplate: string;
  totalEstimateHrs: number;
}

export interface RiskFinding {
  kind: RiskKind;
  level: RiskLevel;
  detail: string;
}

export interface TaskNode {
  id: string;
  status: string;
  dueDate?: number | null;
  estimateMins: number;
  priority: number;
  ownerName?: string | null;
  dependsOn: string[]; // prerequisite task ids
}

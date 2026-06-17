/**
 * Project → planner integration helpers (Phase 6E). Pure mapping only.
 *
 * Converts a ProjectTask shape into the PlannerTask creation shape used by Phase 6D.
 * Scheduling itself goes through the planner optimizer + approval-gated
 * CalendarWriteRequest flow — this module never writes a provider calendar.
 */

export interface ProjectTaskLike {
  id: string;
  title: string;
  priority: number;
  dueDate?: Date | null;
  estimateMins: number;
}

export interface PlannerTaskCreate {
  title: string;
  priority: number;
  dueDate: string | null;
  estimateMins: number;
  requiresFocus: boolean;
}

export function toPlannerTask(t: ProjectTaskLike, projectTitle: string): PlannerTaskCreate {
  return {
    title: `[${projectTitle}] ${t.title}`,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    estimateMins: Math.max(15, t.estimateMins),
    requiresFocus: t.estimateMins >= 120,
  };
}

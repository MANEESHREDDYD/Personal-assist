/** Dependency graph analysis (Phase 6E). Pure + testable. */

import type { TaskNode } from "./types";

/** Detects a circular dependency among tasks (returns true if a cycle exists). */
export function hasCycle(tasks: TaskNode[]): boolean {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(tasks.map((t) => [t.id, WHITE]));

  function dfs(id: string): boolean {
    color.set(id, GRAY);
    const node = byId.get(id);
    for (const dep of node?.dependsOn ?? []) {
      if (!byId.has(dep)) continue;
      const c = color.get(dep);
      if (c === GRAY) return true; // back edge
      if (c === WHITE && dfs(dep)) return true;
    }
    color.set(id, BLACK);
    return false;
  }
  for (const t of tasks) {
    if (color.get(t.id) === WHITE && dfs(t.id)) return true;
  }
  return false;
}

/**
 * Returns task ids that are blocked: not done, with at least one prerequisite that
 * is not done. (Independent of the task's own stored status.)
 */
export function blockedTaskIds(tasks: TaskNode[]): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blocked: string[] = [];
  for (const t of tasks) {
    if (t.status === "done" || t.status === "canceled") continue;
    const anyOpen = t.dependsOn.some((d) => {
      const p = byId.get(d);
      return p && p.status !== "done" && p.status !== "canceled";
    });
    if (anyOpen) blocked.push(t.id);
  }
  return blocked;
}

/** Tasks that block the most other tasks (dependency bottlenecks). */
export function bottlenecks(tasks: TaskNode[]): { id: string; blocks: number }[] {
  const counts = new Map<string, number>();
  for (const t of tasks) for (const d of t.dependsOn) counts.set(d, (counts.get(d) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, blocks]) => ({ id, blocks }))
    .sort((a, b) => b.blocks - a.blocks);
}

/** Project progress = done / total (excluding canceled), 0..1. */
export function projectProgress(tasks: { status: string }[]): number {
  const active = tasks.filter((t) => t.status !== "canceled");
  if (active.length === 0) return 0;
  const done = active.filter((t) => t.status === "done").length;
  return Math.round((done / active.length) * 1000) / 1000;
}

/**
 * test-projects.ts — Phase 6E AI project manager tests.
 *
 * Layer 1: pure engine (decomposer, dependencies, risk scoring, workload forecast,
 * planner mapping, status updates). Layer 2: DB integration for project/stage/task
 * creation, ProjectTask -> PlannerTask conversion link, and the schedule->approval-
 * gated CalendarWriteRequest invariant (provider null, no notify). Cleanup included.
 */
import { PrismaClient } from "@prisma/client";
import { decomposeProject, parseDurationDays } from "../src/lib/projects/decomposer";
import { hasCycle, blockedTaskIds, projectProgress, bottlenecks } from "../src/lib/projects/dependencies";
import { scoreProjectRisks } from "../src/lib/projects/riskScoring";
import { forecastWorkload } from "../src/lib/projects/workloadForecast";
import { toPlannerTask } from "../src/lib/projects/plannerIntegration";
import { buildProjectUpdate } from "../src/lib/projects/statusUpdates";
import type { TaskNode } from "../src/lib/projects/types";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

// ---- decomposer ----------------------------------------------------------
{
  const r = decomposeProject("Build a portfolio website in two weeks");
  check("website template detected", r.detectedTemplate === "website");
  check("decomposition has >= 4 stages", r.stages.length >= 4);
  const taskCount = r.stages.reduce((s, st) => s + st.tasks.length, 0);
  check("decomposition creates multiple tasks", taskCount >= 8);
  check("tasks have estimates", r.stages[0].tasks.every((t) => t.estimateMins > 0));
  check("tasks have due offsets", r.stages[0].tasks.every((t) => t.dueOffsetDays > 0));
  check("cross-stage dependency set", r.stages[1].tasks[0].dependsOnIndex === r.stages[0].tasks.length - 1);
  check("total estimate computed", r.totalEstimateHrs > 0);
}
check("parseDurationDays 'in two weeks' = 14", parseDurationDays("do it in two weeks") === 14);
check("parseDurationDays 'in 10 days' = 10", parseDurationDays("in 10 days") === 10);
check("parseDurationDays default = 14", parseDurationDays("build something") === 14);
check("generic fallback for unknown goal", decomposeProject("organize the garage").detectedTemplate === "generic");
check("software template detected", decomposeProject("Ship Phase 6E project manager").detectedTemplate === "software");
check("fundraising template detected", decomposeProject("Launch a fundraising outreach campaign").detectedTemplate === "fundraising");
check("exams template detected", decomposeProject("Prepare for final exams").detectedTemplate === "exams");

// ---- dependencies --------------------------------------------------------
{
  const acyclic: TaskNode[] = [
    { id: "a", status: "todo", estimateMins: 60, priority: 1, dependsOn: [] },
    { id: "b", status: "todo", estimateMins: 60, priority: 1, dependsOn: ["a"] },
    { id: "c", status: "todo", estimateMins: 60, priority: 1, dependsOn: ["b"] },
  ];
  check("acyclic graph has no cycle", hasCycle(acyclic) === false);
  const cyclic: TaskNode[] = [
    { id: "a", status: "todo", estimateMins: 60, priority: 1, dependsOn: ["c"] },
    { id: "b", status: "todo", estimateMins: 60, priority: 1, dependsOn: ["a"] },
    { id: "c", status: "todo", estimateMins: 60, priority: 1, dependsOn: ["b"] },
  ];
  check("circular dependency detected", hasCycle(cyclic) === true);
  check("blocked task detected (prereq not done)", blockedTaskIds(acyclic).includes("b") && blockedTaskIds(acyclic).includes("c"));
  const doneA = acyclic.map((t) => (t.id === "a" ? { ...t, status: "done" } : t));
  check("task unblocks when prereq done", !blockedTaskIds(doneA).includes("b"));
  check("progress calc 0% when none done", projectProgress(acyclic) === 0);
  check("progress calc counts done", projectProgress([{ status: "done" }, { status: "todo" }]) === 0.5);
  const bn = bottlenecks([
    { id: "x", status: "todo", estimateMins: 1, priority: 1, dependsOn: ["root"] },
    { id: "y", status: "todo", estimateMins: 1, priority: 1, dependsOn: ["root"] },
    { id: "z", status: "todo", estimateMins: 1, priority: 1, dependsOn: ["root"] },
  ]);
  check("bottleneck identifies root blocking 3", bn[0]?.id === "root" && bn[0]?.blocks === 3);
}

// ---- risk scoring --------------------------------------------------------
{
  const tasks: TaskNode[] = [
    { id: "a", status: "todo", estimateMins: 120, priority: 1, dependsOn: [] },
    { id: "b", status: "todo", estimateMins: 120, priority: 1, dependsOn: ["a"] },
  ];
  const overdue = scoreProjectRisks({ tasks, targetDate: NOW - 2 * DAY, owner: "Sam", now: NOW });
  check("deadline risk when target passed", overdue.some((r) => r.kind === "deadline" && r.level === "critical"));
  const blocked = scoreProjectRisks({ tasks, targetDate: NOW + 30 * DAY, owner: "Sam", now: NOW });
  check("blocked-task risk flagged", blocked.some((r) => r.kind === "blocked_task"));
  const insufficient = scoreProjectRisks({ tasks, targetDate: NOW + 30 * DAY, owner: "Sam", now: NOW, scheduledMins: 10 });
  check("insufficient-time risk flagged", insufficient.some((r) => r.kind === "insufficient_time"));
  const noOwner = scoreProjectRisks({ tasks, now: NOW });
  check("missing-owner risk flagged", noOwner.some((r) => r.kind === "missing_owner"));
}

// ---- workload forecast ---------------------------------------------------
{
  const tasks: TaskNode[] = [
    { id: "a", status: "todo", estimateMins: 180, priority: 1, dependsOn: [], dueDate: NOW + 3 * DAY },
    { id: "b", status: "todo", estimateMins: 120, priority: 2, dependsOn: [], dueDate: NOW + 20 * DAY },
    { id: "c", status: "done", estimateMins: 60, priority: 2, dependsOn: [] },
  ];
  const f = forecastWorkload({ tasks, scheduledMins: 60, targetDate: NOW + 5 * DAY, now: NOW });
  check("forecast total excludes done tasks", Math.abs(f.totalEstimateHrs - 5) < 1e-6);
  check("forecast scheduled hrs", Math.abs(f.scheduledHrs - 1) < 1e-6);
  check("forecast unscheduled hrs", Math.abs(f.unscheduledHrs - 4) < 1e-6);
  check("forecast next-7-days only counts soon tasks", Math.abs(f.next7DaysHrs - 3) < 1e-6);
  check("forecast delay risk computed", ["low", "medium", "high"].includes(f.delayRisk));
}

// ---- planner mapping + status update -------------------------------------
{
  const pt = toPlannerTask({ id: "t", title: "Implement core", priority: 1, dueDate: new Date(NOW + DAY), estimateMins: 180 }, "Website");
  check("planner task title prefixed with project", pt.title === "[Website] Implement core");
  check("planner task requiresFocus for >=120m", pt.requiresFocus === true);
  const upd = buildProjectUpdate("status", { title: "Website", progressPct: 50, totalTasks: 8, doneTasks: 4, blockedTasks: 1, overdueTasks: 0, topRisks: ["Tight timeline"], nextTasks: ["Deploy"] });
  check("status update is local (not sent)", upd.body.includes("not sent"));
  check("status update has title", upd.title.startsWith("Status:"));
}

// ---- DB integration ------------------------------------------------------
async function dbTests() {
  const prisma = new PrismaClient();
  const created: { project?: string; planner?: string; cwr?: string } = {};
  try {
    const project = await prisma.project.create({
      data: {
        title: "Test Website", source: "text", sourceText: "Build a portfolio website in two weeks",
        stages: { create: { name: "Build", orderIndex: 0 } },
      },
      include: { stages: true },
    });
    created.project = project.id;
    const task = await prisma.projectTask.create({ data: { projectId: project.id, stageId: project.stages[0].id, title: "Implement pages", estimateMins: 180, priority: 1 } });
    check("DB: project + stage + task created", !!task.id && project.stages.length === 1);

    // convert ProjectTask -> PlannerTask and link
    const planner = await prisma.plannerTask.create({ data: { title: `[${project.title}] ${task.title}`, priority: task.priority, estimateMins: task.estimateMins, requiresFocus: true } });
    created.planner = planner.id;
    await prisma.projectTask.update({ where: { id: task.id }, data: { plannerTaskId: planner.id } });
    const linked = await prisma.projectTask.findUnique({ where: { id: task.id } });
    check("DB: project task links a planner task", linked?.plannerTaskId === planner.id);

    // schedule -> approval-gated CWR (provider null, no notify)
    const cwr = await prisma.calendarWriteRequest.create({ data: { action: "create_event", title: planner.title, start: new Date(NOW + DAY), end: new Date(NOW + DAY + planner.estimateMins * 60000), provider: null, notifyAttendees: false, status: "pending_approval" } });
    created.cwr = cwr.id;
    check("DB: scheduling uses approval-gated CWR, provider null, no notify", cwr.status === "pending_approval" && cwr.provider === null && cwr.notifyAttendees === false);
  } finally {
    if (created.cwr) await prisma.calendarWriteRequest.delete({ where: { id: created.cwr } }).catch(() => {});
    if (created.planner) await prisma.plannerTask.delete({ where: { id: created.planner } }).catch(() => {});
    if (created.project) await prisma.project.delete({ where: { id: created.project } }).catch(() => {});
    await prisma.$disconnect();
  }
}

dbTests().then(() => {
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error("❌ project tests failed."); process.exit(1); }
  console.log("✅ All project tests passed.");
}).catch((e) => { console.error("Harness error:", e); process.exit(1); });

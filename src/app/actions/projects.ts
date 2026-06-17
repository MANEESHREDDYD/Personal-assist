"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { decomposeProject } from "@/lib/projects/decomposer";
import { hasCycle, blockedTaskIds, projectProgress } from "@/lib/projects/dependencies";
import { scoreProjectRisks } from "@/lib/projects/riskScoring";
import { forecastWorkload } from "@/lib/projects/workloadForecast";
import { buildProjectUpdate, type UpdateKind } from "@/lib/projects/statusUpdates";
import { toPlannerTask } from "@/lib/projects/plannerIntegration";
import type { TaskNode } from "@/lib/projects/types";

const DAY = 86_400_000;

// ---- Create --------------------------------------------------------------

export async function createProject(input: { title: string; description?: string; owner?: string; priority?: number; targetDate?: string | null }) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    const p = await prisma.project.create({
      data: { title: input.title.trim(), description: input.description || null, owner: input.owner || null, priority: input.priority ?? 3, targetDate: input.targetDate ? new Date(input.targetDate) : null, source: "manual" },
    });
    await logAudit("project_created", "Project", p.id, {});
    revalidatePath("/projects");
    return { success: true, id: p.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function createProjectFromText(input: { text: string; owner?: string; targetDate?: string | null }) {
  try {
    const text = (input.text || "").trim();
    if (!text) return { success: false, error: "Describe the project." };
    const decomp = decomposeProject(text);
    const now = Date.now();

    const project = await prisma.project.create({
      data: {
        title: text.length > 70 ? text.slice(0, 67) + "…" : text,
        description: decomp.brief, owner: input.owner || null,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        source: "text", sourceText: text,
      },
    });

    // Create stages + tasks; track flat task ids for dependency wiring.
    const flatTaskIds: string[] = [];
    const flatDepends: (number | undefined)[] = [];
    let orderIndex = 0;
    for (let si = 0; si < decomp.stages.length; si++) {
      const sd = decomp.stages[si];
      const stage = await prisma.projectStage.create({ data: { projectId: project.id, name: sd.name, orderIndex: si } });
      for (const td of sd.tasks) {
        const t = await prisma.projectTask.create({
          data: { projectId: project.id, stageId: stage.id, title: td.title, estimateMins: td.estimateMins, priority: td.priority, dueDate: new Date(now + td.dueOffsetDays * DAY), orderIndex: orderIndex++ },
        });
        flatTaskIds.push(t.id);
        flatDepends.push(td.dependsOnIndex);
      }
    }
    // Wire dependencies (dependent flat index -> prerequisite flat index).
    for (let i = 0; i < flatTaskIds.length; i++) {
      const dep = flatDepends[i];
      if (dep != null && dep >= 0 && dep < flatTaskIds.length) {
        await prisma.taskDependency.create({ data: { dependentTaskId: flatTaskIds[i], prerequisiteTaskId: flatTaskIds[dep] } }).catch(() => {});
      }
    }
    await prisma.projectPlanRun.create({ data: { projectId: project.id, stageCount: decomp.stages.length, taskCount: flatTaskIds.length, summaryJson: JSON.stringify({ template: decomp.detectedTemplate, totalEstimateHrs: decomp.totalEstimateHrs, riskNotes: decomp.riskNotes }) } });
    // Seed decomposition risk notes.
    for (const note of decomp.riskNotes) {
      await prisma.projectRisk.create({ data: { projectId: project.id, kind: "deadline", level: "medium", detail: note } });
    }
    await logAudit("project_created_from_text", "Project", project.id, { template: decomp.detectedTemplate, tasks: flatTaskIds.length });
    revalidatePath("/projects");
    return { success: true, id: project.id, taskCount: flatTaskIds.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Tasks + dependencies ------------------------------------------------

export async function addProjectTask(projectId: string, input: { title: string; estimateMins?: number; priority?: number; stageId?: string | null; dueDate?: string | null }) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    await prisma.projectTask.create({ data: { projectId, title: input.title.trim(), estimateMins: input.estimateMins ?? 60, priority: input.priority ?? 3, stageId: input.stageId || null, dueDate: input.dueDate ? new Date(input.dueDate) : null } });
    revalidatePath(`/projects/${projectId}/tasks`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function setProjectTaskStatus(taskId: string, status: string) {
  try {
    const t = await prisma.projectTask.update({ where: { id: taskId }, data: { status } });
    revalidatePath(`/projects/${t.projectId}/tasks`);
    revalidatePath(`/projects/${t.projectId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function addDependency(projectId: string, dependentTaskId: string, prerequisiteTaskId: string) {
  try {
    if (dependentTaskId === prerequisiteTaskId) return { success: false, error: "A task cannot depend on itself." };
    // simulate the new edge and check for a cycle before persisting
    const nodes = await buildTaskNodes(projectId);
    const dep = nodes.find((n) => n.id === dependentTaskId);
    if (dep && !dep.dependsOn.includes(prerequisiteTaskId)) dep.dependsOn.push(prerequisiteTaskId);
    if (hasCycle(nodes)) return { success: false, error: "That dependency would create a cycle." };
    await prisma.taskDependency.create({ data: { dependentTaskId, prerequisiteTaskId } });
    await logAudit("project_dependency_added", "ProjectTask", dependentTaskId, { prerequisiteTaskId });
    revalidatePath(`/projects/${projectId}/tasks`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

async function buildTaskNodes(projectId: string): Promise<TaskNode[]> {
  const tasks = await prisma.projectTask.findMany({ where: { projectId }, include: { dependsOn: true } });
  return tasks.map((t) => ({ id: t.id, status: t.status, dueDate: t.dueDate?.getTime() ?? null, estimateMins: t.estimateMins, priority: t.priority, ownerName: t.ownerName, dependsOn: t.dependsOn.map((d) => d.prerequisiteTaskId) }));
}

// ---- Risk + forecast -----------------------------------------------------

async function scheduledMinsFor(projectId: string): Promise<number> {
  const tasks = await prisma.projectTask.findMany({ where: { projectId, plannerTaskId: { not: null }, status: { notIn: ["done", "canceled"] } } });
  return tasks.reduce((s, t) => s + t.estimateMins, 0);
}

export async function scoreRisks(projectId: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Not found" };
    const nodes = await buildTaskNodes(projectId);
    const findings = scoreProjectRisks({ tasks: nodes, targetDate: project.targetDate?.getTime() ?? null, owner: project.owner, now: Date.now(), scheduledMins: await scheduledMinsFor(projectId), lastUpdatedMs: project.updatedAt.getTime() });
    await prisma.projectRisk.deleteMany({ where: { projectId, resolved: false } });
    for (const f of findings) await prisma.projectRisk.create({ data: { projectId, kind: f.kind, level: f.level, detail: f.detail } });
    await logAudit("project_risks_scored", "Project", projectId, { count: findings.length });
    revalidatePath(`/projects/${projectId}/risks`);
    return { success: true, count: findings.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function runForecast(projectId: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "Not found" };
    const nodes = await buildTaskNodes(projectId);
    const f = forecastWorkload({ tasks: nodes, scheduledMins: await scheduledMinsFor(projectId), targetDate: project.targetDate?.getTime() ?? null, now: Date.now() });
    await prisma.workloadForecast.create({ data: { projectId, totalEstimateHrs: f.totalEstimateHrs, scheduledHrs: f.scheduledHrs, unscheduledHrs: f.unscheduledHrs, overloadedDays: 0, delayRisk: f.delayRisk, metricsJson: JSON.stringify(f) } });
    await logAudit("project_forecast_run", "Project", projectId, { delayRisk: f.delayRisk });
    revalidatePath(`/projects/${projectId}/workload`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Planner integration -------------------------------------------------

export async function convertTaskToPlanner(taskId: string) {
  try {
    const t = await prisma.projectTask.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!t) return { success: false, error: "Not found" };
    if (t.plannerTaskId) return { success: false, error: "Already converted to a planner task." };
    const mapped = toPlannerTask({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, estimateMins: t.estimateMins }, t.project.title);
    const planner = await prisma.plannerTask.create({ data: { title: mapped.title, priority: mapped.priority, estimateMins: mapped.estimateMins, requiresFocus: mapped.requiresFocus, dueDate: mapped.dueDate ? new Date(mapped.dueDate) : null } });
    await prisma.projectTask.update({ where: { id: taskId }, data: { plannerTaskId: planner.id } });
    await logAudit("project_task_converted_to_planner", "PlannerTask", planner.id, { projectTaskId: taskId });
    revalidatePath(`/projects/${t.projectId}/tasks`);
    return { success: true, plannerTaskId: planner.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function scheduleProjectTasks(projectId: string) {
  try {
    const tasks = await prisma.projectTask.findMany({ where: { projectId, plannerTaskId: null, status: { notIn: ["done", "canceled"] } }, include: { project: true } });
    let converted = 0;
    for (const t of tasks) {
      const mapped = toPlannerTask({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, estimateMins: t.estimateMins }, t.project.title);
      const planner = await prisma.plannerTask.create({ data: { title: mapped.title, priority: mapped.priority, estimateMins: mapped.estimateMins, requiresFocus: mapped.requiresFocus, dueDate: mapped.dueDate ? new Date(mapped.dueDate) : null } });
      await prisma.projectTask.update({ where: { id: t.id }, data: { plannerTaskId: planner.id } });
      converted++;
    }
    await logAudit("project_tasks_scheduled_to_planner", "Project", projectId, { converted });
    revalidatePath(`/projects/${projectId}/tasks`);
    return { success: true, converted, note: "Open the Optimizer to schedule these planner tasks into your calendar (approval-gated)." };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Documents -----------------------------------------------------------

export async function linkProjectDocument(projectId: string, input: { documentId?: string | null; title: string; notes?: string }) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    await prisma.projectDocument.create({ data: { projectId, documentId: input.documentId || null, title: input.title.trim(), notes: input.notes || null } });
    await logAudit("project_document_linked", "Project", projectId, {});
    revalidatePath(`/projects/${projectId}/documents`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Status updates ------------------------------------------------------

export async function generateStatusUpdate(projectId: string, kind: UpdateKind) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId }, include: { tasks: true, risks: { where: { resolved: false } } } });
    if (!project) return { success: false, error: "Not found" };
    const nodes = await buildTaskNodes(projectId);
    const blocked = blockedTaskIds(nodes);
    const now = Date.now();
    const overdue = project.tasks.filter((t) => t.dueDate && t.dueDate.getTime() < now && t.status !== "done" && t.status !== "canceled").length;
    const next = project.tasks.filter((t) => t.status === "todo" || t.status === "in_progress").slice(0, 5).map((t) => t.title);
    const upd = buildProjectUpdate(kind, {
      title: project.title, progressPct: Math.round(projectProgress(project.tasks) * 100),
      totalTasks: project.tasks.length, doneTasks: project.tasks.filter((t) => t.status === "done").length,
      blockedTasks: blocked.length, overdueTasks: overdue,
      topRisks: project.risks.slice(0, 5).map((r) => `[${r.level}] ${r.detail}`),
      nextTasks: next, targetDate: project.targetDate?.toLocaleDateString() ?? null, owner: project.owner,
    });
    await prisma.projectStatusUpdate.create({ data: { projectId, kind, title: upd.title, body: upd.body } });
    await logAudit("project_status_update_generated", "Project", projectId, { kind });
    revalidatePath(`/projects/${projectId}/status`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

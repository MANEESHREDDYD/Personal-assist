"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { expandDailyRules, meetingLoadHours, type Interval } from "@/lib/scheduling/engine";
import { scheduleTasks } from "@/lib/planner/taskScheduler";
import { scheduleHabit } from "@/lib/planner/habitScheduler";
import { optimizeFocus } from "@/lib/planner/focusOptimizer";
import { proposeFlexibleMoves, type FlexibleMeeting } from "@/lib/planner/flexibleMeetingOptimizer";
import { analyzeDayLoads, contextSwitchScore, burnoutRisk } from "@/lib/planner/scoring";
import { buildWeeklyReview } from "@/lib/planner/weeklyReview";
import type { PlannerContext, TaskInput, HabitInput } from "@/lib/planner/types";
import { getWorkingHours, getSchedulingPreferences, createCalendarWriteRequest } from "@/app/actions/scheduling";

// ---- Tasks ---------------------------------------------------------------

export async function createTask(input: { title: string; priority?: number; dueDate?: string | null; estimateMins?: number; requiresFocus?: boolean; energyLevel?: string; description?: string }) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    const t = await prisma.plannerTask.create({
      data: {
        title: input.title.trim(), description: input.description || null,
        priority: input.priority ?? 3, dueDate: input.dueDate ? new Date(input.dueDate) : null,
        estimateMins: input.estimateMins ?? 30, requiresFocus: !!input.requiresFocus,
        energyLevel: input.energyLevel || "medium",
      },
    });
    await logAudit("planner_task_created", "PlannerTask", t.id, {});
    revalidatePath("/tasks");
    return { success: true, id: t.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function setTaskStatus(id: string, status: string) {
  try { await prisma.plannerTask.update({ where: { id }, data: { status } }); revalidatePath("/tasks"); revalidatePath(`/tasks/${id}`); return { success: true }; }
  catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function deleteTask(id: string) {
  try { await prisma.plannerTask.delete({ where: { id } }); revalidatePath("/tasks"); return { success: true }; }
  catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Habits --------------------------------------------------------------

export async function createHabit(input: { name: string; durationMins?: number; frequency?: string; windowStartMin?: number; windowEndMin?: number }) {
  try {
    if (!input.name?.trim()) return { success: false, error: "Name is required." };
    const h = await prisma.habit.create({
      data: {
        name: input.name.trim(), durationMins: input.durationMins ?? 30, frequency: input.frequency || "daily",
        windowStartMin: input.windowStartMin ?? 360, windowEndMin: input.windowEndMin ?? 1320,
      },
    });
    await logAudit("planner_habit_created", "Habit", h.id, {});
    revalidatePath("/habits");
    return { success: true, id: h.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function deleteHabit(id: string) {
  try { await prisma.habit.delete({ where: { id } }); revalidatePath("/habits"); return { success: true }; }
  catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Planner preferences (focus policy) ----------------------------------

export async function getPlannerPreference() {
  const p = await prisma.plannerPreference.findUnique({ where: { singleton: "default" } });
  return p ?? { weeklyFocusGoalHrs: 10, minFocusBlockMins: 90, preferFocusMornings: true, noBackToBack: true, recoveryAfterLongMtgMins: 15, maxMeetingHoursDay: 6 };
}

export async function savePlannerPreference(input: { weeklyFocusGoalHrs: number; minFocusBlockMins: number; preferFocusMornings: boolean; maxMeetingHoursDay: number }) {
  try {
    await prisma.plannerPreference.upsert({ where: { singleton: "default" }, update: { ...input }, create: { singleton: "default", ...input } });
    await logAudit("planner_preference_saved", "PlannerPreference", "default", {});
    revalidatePath("/focus");
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

// ---- Busy + context ------------------------------------------------------

async function buildContext(rangeStart: number, rangeEnd: number): Promise<PlannerContext> {
  const wh = await getWorkingHours();
  const prefs = await getSchedulingPreferences();
  const startD = new Date(rangeStart), endD = new Date(rangeEnd);
  const [events, holds, blocks, focusBlocks, dns] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { startDate: { lt: endD }, endDate: { gt: startD } } }),
    prisma.calendarHold.findMany({ where: { status: { in: ["held", "promoted"] }, start: { lt: endD }, end: { gt: startD } } }),
    prisma.timeBlock.findMany({ where: { start: { lt: endD }, end: { gt: startD } } }),
    prisma.focusBlock.findMany({ where: { status: { in: ["held"] }, start: { lt: endD }, end: { gt: startD } } }),
    prisma.availabilityRule.findMany({ where: { kind: "do_not_schedule", enabled: true } }),
  ]);
  const explicit: Interval[] = [
    ...events.filter((e) => e.startDate && e.endDate).map((e) => ({ start: e.startDate!.getTime(), end: e.endDate!.getTime() })),
    ...holds.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() })),
    ...blocks.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
    ...focusBlocks.map((f) => ({ start: f.start.getTime(), end: f.end.getTime() })),
  ];
  const daily = [
    ...(prefs.lunchStartMinute != null && prefs.lunchEndMinute != null ? [{ startMinute: prefs.lunchStartMinute, endMinute: prefs.lunchEndMinute }] : []),
    ...dns.map((r) => ({ dayOfWeek: r.dayOfWeek, startMinute: r.startMinute, endMinute: r.endMinute })),
  ];
  return {
    workingDays: wh.days, timezone: wh.timezone,
    busy: [...explicit, ...expandDailyRules(rangeStart, rangeEnd, daily, wh.timezone)],
    rangeStart, rangeEnd, bufferBeforeMins: prefs.bufferBeforeMins, bufferAfterMins: prefs.bufferAfterMins,
    slotGranularityMins: prefs.slotGranularityMins, minNoticeMins: 0, preferMornings: true,
  };
}

// ---- Optimization run ----------------------------------------------------

export async function runOptimization(scope: "day" | "week" = "day") {
  try {
    const now = Date.now();
    const rangeStart = now;
    const rangeEnd = now + (scope === "week" ? 7 : 1) * 86_400_000;
    const ctx = await buildContext(rangeStart, rangeEnd);
    const pref = await getPlannerPreference();

    const tasks = await prisma.plannerTask.findMany({ where: { status: { in: ["todo", "in_progress"] } } });
    const habits = await prisma.habit.findMany({ where: { active: true } });
    const flexibles = await prisma.flexibleMeeting.findMany({ where: { flexible: true, start: { gte: new Date(rangeStart), lt: new Date(rangeEnd) } } });

    const taskInputs: TaskInput[] = tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate?.getTime() ?? null, estimateMins: t.estimateMins, requiresFocus: t.requiresFocus }));
    const taskResult = scheduleTasks(taskInputs, ctx);
    const focusBlocks = optimizeFocus({ weeklyFocusGoalHrs: scope === "week" ? pref.weeklyFocusGoalHrs : pref.weeklyFocusGoalHrs / 5, minFocusBlockMins: pref.minFocusBlockMins, preferFocusMornings: pref.preferFocusMornings }, ctx);
    const habitItems = habits.flatMap((h) => scheduleHabit({ id: h.id, name: h.name, durationMins: h.durationMins, windowStartMin: h.windowStartMin, windowEndMin: h.windowEndMin, frequency: h.frequency as HabitInput["frequency"] }, ctx));
    const moves = proposeFlexibleMoves(flexibles.map((m) => ({ id: m.id, title: m.title, start: m.start.getTime(), end: m.end.getTime() })) as FlexibleMeeting[], ctx, pref.maxMeetingHoursDay);

    const loads = analyzeDayLoads(ctx.busy, rangeStart, rangeEnd, () => new Date().getTimezoneOffset() * -1);
    const plannedFocusHours = focusBlocks.reduce((s, b) => s + (b.end - b.start), 0) / 3_600_000;
    const summary = {
      meetingHours: Math.round(meetingLoadHours(ctx.busy, { start: rangeStart, end: rangeEnd }) * 100) / 100,
      fragmentedDays: loads.filter((l) => l.fragmented).length,
      contextSwitchScore: contextSwitchScore(loads),
      plannedFocusHours: Math.round(plannedFocusHours * 100) / 100,
      tasksScheduled: taskResult.scheduled.length,
      tasksUnscheduled: taskResult.unscheduled.length,
      burnoutRisk: burnoutRisk(loads, pref.maxMeetingHoursDay, Math.max(0, pref.weeklyFocusGoalHrs - plannedFocusHours)),
    };

    const run = await prisma.optimizationRun.create({
      data: {
        scope, rangeStart: new Date(rangeStart), rangeEnd: new Date(rangeEnd), summaryJson: JSON.stringify(summary),
        proposals: {
          create: [
            ...taskResult.scheduled.map((s) => ({ kind: "schedule_task", title: s.title, start: new Date(s.start), end: new Date(s.end), refId: s.refId, rationale: s.rationale, score: s.score })),
            ...focusBlocks.map((s) => ({ kind: "focus_block", title: s.title, start: new Date(s.start), end: new Date(s.end), rationale: s.rationale, score: s.score })),
            ...habitItems.map((s) => ({ kind: "schedule_habit", title: s.title, start: new Date(s.start), end: new Date(s.end), refId: s.refId, rationale: s.rationale, score: s.score })),
            ...moves.map((m) => ({ kind: "move_flexible_meeting", title: m.title, start: new Date(m.toStart), end: new Date(m.toEnd), refId: m.meetingId, rationale: m.rationale, score: 0.6 })),
          ],
        },
      },
      include: { proposals: true },
    });
    await logAudit("planner_optimization_run", "OptimizationRun", run.id, { scope, proposals: run.proposals.length });
    revalidatePath("/optimizer");
    revalidatePath(`/optimizer/${run.id}`);
    return { success: true, id: run.id, proposalCount: run.proposals.length, unscheduled: taskResult.unscheduled.length };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function approveProposal(id: string) {
  try {
    const p = await prisma.optimizationProposal.findUnique({ where: { id } });
    if (!p) return { success: false, error: "Not found" };
    if (p.status !== "proposed") return { success: false, error: `Cannot approve from ${p.status}` };
    const action = p.kind === "move_flexible_meeting" ? "move_event" : "create_event";
    const cwr = await createCalendarWriteRequest({
      action, title: p.title, start: p.start.toISOString(), end: p.end.toISOString(), provider: null, notifyAttendees: false,
    });
    await prisma.optimizationProposal.update({ where: { id }, data: { status: "approved", calendarWriteRequestId: cwr.id ?? null } });
    // Persist the local schedule record for tasks/habits/focus.
    if (p.kind === "schedule_task" && p.refId) await prisma.plannerTaskSchedule.create({ data: { taskId: p.refId, start: p.start, end: p.end, source: "optimizer", status: "planned" } }).catch(() => {});
    if (p.kind === "schedule_habit" && p.refId) await prisma.habitSchedule.create({ data: { habitId: p.refId, start: p.start, end: p.end } }).catch(() => {});
    if (p.kind === "focus_block") await prisma.focusBlock.create({ data: { title: p.title, start: p.start, end: p.end, status: "proposed" } }).catch(() => {});
    await logAudit("planner_proposal_approved", "OptimizationProposal", id, { kind: p.kind, calendarWriteRequestId: cwr.id });
    revalidatePath(`/optimizer/${p.runId}`);
    return { success: true, calendarWriteRequestId: cwr.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function rejectProposal(id: string) {
  try {
    const p = await prisma.optimizationProposal.update({ where: { id }, data: { status: "rejected" } });
    await logAudit("planner_proposal_rejected", "OptimizationProposal", id, {});
    revalidatePath(`/optimizer/${p.runId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

export async function generateWeeklyReview() {
  try {
    const now = Date.now();
    const rangeStart = now, rangeEnd = now + 7 * 86_400_000;
    const ctx = await buildContext(rangeStart, rangeEnd);
    const pref = await getPlannerPreference();
    const [taskCount, scheduledCount, overdue, habitScheduled, focusBlocks] = await Promise.all([
      prisma.plannerTask.count({ where: { status: { in: ["todo", "in_progress", "scheduled"] } } }),
      prisma.plannerTaskSchedule.count({ where: { start: { gte: new Date(rangeStart), lt: new Date(rangeEnd) } } }),
      prisma.plannerTask.count({ where: { status: { in: ["todo", "in_progress"] }, dueDate: { lt: new Date() } } }),
      prisma.habitSchedule.count({ where: { start: { gte: new Date(rangeStart), lt: new Date(rangeEnd) } } }),
      prisma.focusBlock.findMany({ where: { start: { gte: new Date(rangeStart), lt: new Date(rangeEnd) } } }),
    ]);
    const plannedFocusHours = focusBlocks.reduce((s, b) => s + (b.end.getTime() - b.start.getTime()), 0) / 3_600_000;
    const review = buildWeeklyReview({
      busy: ctx.busy, rangeStart, rangeEnd, offset: () => new Date().getTimezoneOffset() * -1,
      plannedFocusHours, weeklyFocusGoalHrs: pref.weeklyFocusGoalHrs, maxMeetingHoursDay: pref.maxMeetingHoursDay,
      taskCount, scheduledTaskCount: scheduledCount, overdueTaskCount: overdue, habitScheduledCount: habitScheduled,
    });
    const wr = await prisma.weeklyReview.create({ data: { rangeStart: new Date(rangeStart), rangeEnd: new Date(rangeEnd), summary: review.summary, metricsJson: JSON.stringify(review) } });
    await logAudit("planner_weekly_review_generated", "WeeklyReview", wr.id, {});
    revalidatePath("/weekly-review");
    return { success: true, id: wr.id };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message }; }
}

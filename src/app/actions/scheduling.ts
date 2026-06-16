"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import {
  computeFreeSlots,
  buildCalendarWritePreview,
  expandDailyRules,
  type WorkingDay,
  type Interval,
} from "@/lib/scheduling/engine";

const DEFAULT_DAYS: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  enabled: day >= 1 && day <= 5,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

// ---- Working hours -------------------------------------------------------

export async function getWorkingHours() {
  const profile = await prisma.workingHoursProfile.findFirst({ where: { isActive: true } });
  if (!profile) {
    return { timezone: "UTC", days: DEFAULT_DAYS, exists: false };
  }
  let days: WorkingDay[] = DEFAULT_DAYS;
  try { days = JSON.parse(profile.daysJson); } catch { /* fall back to default */ }
  return { id: profile.id, timezone: profile.timezone, days, exists: true };
}

export async function saveWorkingHours(input: { timezone: string; days: WorkingDay[] }) {
  try {
    const existing = await prisma.workingHoursProfile.findFirst({ where: { isActive: true } });
    const data = { timezone: input.timezone, daysJson: JSON.stringify(input.days), isActive: true };
    if (existing) await prisma.workingHoursProfile.update({ where: { id: existing.id }, data });
    else await prisma.workingHoursProfile.create({ data: { name: "Default", ...data } });
    await logAudit("working_hours_saved", "WorkingHoursProfile", "default", { timezone: input.timezone });
    revalidatePath("/availability");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Scheduling preferences ----------------------------------------------

export async function getSchedulingPreferences() {
  const pref = await prisma.schedulingPreference.findUnique({ where: { singleton: "default" } });
  return (
    pref ?? {
      bufferBeforeMins: 0, bufferAfterMins: 0, maxMeetingsPerDay: 8, maxMeetingHoursDay: 6,
      minNoticeMins: 120, lunchStartMinute: 12 * 60, lunchEndMinute: 13 * 60, slotGranularityMins: 30,
    }
  );
}

export async function saveSchedulingPreferences(input: {
  bufferBeforeMins: number; bufferAfterMins: number; maxMeetingsPerDay: number;
  maxMeetingHoursDay: number; minNoticeMins: number; lunchStartMinute?: number | null;
  lunchEndMinute?: number | null; slotGranularityMins: number;
}) {
  try {
    await prisma.schedulingPreference.upsert({
      where: { singleton: "default" },
      update: { ...input },
      create: { singleton: "default", ...input },
    });
    await logAudit("scheduling_preferences_saved", "SchedulingPreference", "default", {});
    revalidatePath("/scheduling");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Availability rules --------------------------------------------------

export async function createAvailabilityRule(input: {
  label: string; kind: string; dayOfWeek?: number | null; startMinute: number; endMinute: number;
}) {
  try {
    if (input.endMinute <= input.startMinute) return { success: false, error: "End must be after start." };
    await prisma.availabilityRule.create({
      data: {
        label: input.label, kind: input.kind,
        dayOfWeek: input.dayOfWeek ?? null,
        startMinute: input.startMinute, endMinute: input.endMinute,
      },
    });
    await logAudit("availability_rule_created", "AvailabilityRule", input.kind, {});
    revalidatePath("/availability/rules");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function deleteAvailabilityRule(id: string) {
  try {
    await prisma.availabilityRule.delete({ where: { id } });
    revalidatePath("/availability/rules");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Busy intervals (local only) -----------------------------------------

async function getLocalBusy(rangeStart: number, rangeEnd: number): Promise<Interval[]> {
  const startD = new Date(rangeStart);
  const endD = new Date(rangeEnd);
  const blocks = await prisma.timeBlock.findMany({
    where: { start: { lt: endD }, end: { gt: startD } },
  });
  const holds = await prisma.calendarHold.findMany({
    where: { status: { in: ["held", "promoted"] }, start: { lt: endD }, end: { gt: startD } },
  });
  return [
    ...blocks.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
    ...holds.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() })),
  ];
}

// ---- Availability preview ------------------------------------------------

export async function previewAvailability(input: {
  rangeStart: string; rangeEnd: string; durationMins: number;
}) {
  try {
    const rangeStart = new Date(input.rangeStart).getTime();
    const rangeEnd = new Date(input.rangeEnd).getTime();
    const wh = await getWorkingHours();
    const prefs = await getSchedulingPreferences();

    const busy = await getLocalBusy(rangeStart, rangeEnd);
    // Protect lunch + do-not-schedule rules as busy.
    const dnsRules = await prisma.availabilityRule.findMany({ where: { kind: "do_not_schedule", enabled: true } });
    const dailyRules = [
      ...(prefs.lunchStartMinute != null && prefs.lunchEndMinute != null
        ? [{ startMinute: prefs.lunchStartMinute, endMinute: prefs.lunchEndMinute }]
        : []),
      ...dnsRules.map((r) => ({ dayOfWeek: r.dayOfWeek, startMinute: r.startMinute, endMinute: r.endMinute })),
    ];
    const recurringBusy = expandDailyRules(rangeStart, rangeEnd, dailyRules, wh.timezone);

    const slots = computeFreeSlots({
      durationMins: input.durationMins,
      rangeStart, rangeEnd,
      workingDays: wh.days,
      busy: [...busy, ...recurringBusy],
      timezone: wh.timezone,
      bufferBeforeMins: prefs.bufferBeforeMins,
      bufferAfterMins: prefs.bufferAfterMins,
      slotGranularityMins: prefs.slotGranularityMins,
      minNoticeMins: prefs.minNoticeMins,
      maxPerDay: prefs.maxMeetingsPerDay,
      preferMornings: true,
    });

    // Persist the top suggestions for the planner.
    await prisma.suggestedSlot.deleteMany({ where: { consumed: false } });
    const top = slots.slice(0, 12);
    for (const s of top) {
      await prisma.suggestedSlot.create({
        data: { start: new Date(s.start), end: new Date(s.end), score: s.score, reason: s.reason, forPurpose: "meeting" },
      });
    }
    await logAudit("availability_previewed", "SuggestedSlot", "preview", { count: slots.length });
    return {
      success: true,
      timezone: wh.timezone,
      slots: top.map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString(), score: s.score, reason: s.reason })),
      totalFound: slots.length,
    };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message, slots: [] };
  }
}

// ---- Calendar write requests (approval-gated) ----------------------------

async function providerConfigured(provider?: string | null): Promise<boolean> {
  if (!provider) return false;
  const target = await prisma.providerCalendarTarget.findFirst({ where: { provider, configured: true } });
  // A configured target AND a connected calendar connector would be required to execute.
  if (!target) return false;
  const account = await prisma.connectorAccount.findFirst({
    where: { provider: provider === "google_calendar" ? "google_calendar" : "outlook_calendar", status: "connected" },
  });
  return !!account;
}

export async function createCalendarWriteRequest(input: {
  action?: string; title: string; start: string; end: string; timezone?: string;
  attendees?: { name?: string; email?: string }[]; provider?: string | null; notifyAttendees?: boolean;
}) {
  try {
    const start = new Date(input.start);
    const end = new Date(input.end);
    if (!(end.getTime() > start.getTime())) return { success: false, error: "End must be after start." };

    const busy = await getLocalBusy(start.getTime() - 86_400_000, end.getTime() + 86_400_000);
    const configured = await providerConfigured(input.provider);
    const preview = buildCalendarWritePreview({
      proposed: { start: start.getTime(), end: end.getTime() },
      busy,
      providerConfigured: configured,
      notifyAttendees: !!input.notifyAttendees,
      attendeeCount: input.attendees?.length ?? 0,
    });

    const req = await prisma.calendarWriteRequest.create({
      data: {
        action: input.action || "create_event",
        title: input.title,
        start, end,
        timezone: input.timezone || "UTC",
        attendeesJson: input.attendees ? JSON.stringify(input.attendees) : null,
        provider: input.provider || null,
        notifyAttendees: !!input.notifyAttendees,
        status: "pending_approval",
        preview: {
          create: {
            conflictsJson: JSON.stringify(preview.conflicts.map((c) => ({ start: new Date(c.start).toISOString(), end: new Date(c.end).toISOString() }))),
            hasConflicts: preview.hasConflicts,
            providerAvailable: preview.providerAvailable,
            notifyAttendees: preview.notifyAttendees,
            impactSummary: preview.impactSummary,
          },
        },
      },
    });
    await logAudit("calendar_write_request_created", "CalendarWriteRequest", req.id, {
      action: req.action, provider: req.provider, hasConflicts: preview.hasConflicts,
    });
    revalidatePath("/calendar/write-requests");
    return { success: true, id: req.id, preview };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function approveCalendarWriteRequest(id: string) {
  try {
    const req = await prisma.calendarWriteRequest.findUnique({ where: { id } });
    if (!req) return { success: false, error: "Not found" };
    if (req.status !== "pending_approval") return { success: false, error: `Cannot approve from status ${req.status}` };
    await prisma.calendarWriteRequest.update({ where: { id }, data: { status: "approved", approvedAt: new Date() } });
    await logAudit("calendar_write_request_approved", "CalendarWriteRequest", id, {});
    revalidatePath("/calendar/write-requests");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function rejectCalendarWriteRequest(id: string) {
  try {
    await prisma.calendarWriteRequest.update({ where: { id }, data: { status: "rejected" } });
    await logAudit("calendar_write_request_rejected", "CalendarWriteRequest", id, {});
    revalidatePath("/calendar/write-requests");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

/**
 * Executes an APPROVED calendar write request. There is no provider calendar-write
 * connector yet, so execution creates a LOCAL CalendarHold and records that provider
 * execution is unavailable. This never writes to an external calendar and never
 * notifies attendees.
 */
export async function executeCalendarWriteRequest(id: string) {
  try {
    const req = await prisma.calendarWriteRequest.findUnique({ where: { id }, include: { preview: true } });
    if (!req) return { success: false, error: "Not found" };
    if (req.status !== "approved") return { success: false, error: "Request must be approved before execution." };

    await prisma.calendarHold.create({
      data: { title: req.title, start: req.start, end: req.end, status: "promoted", reason: "calendar_write_request", relatedRequestId: req.id },
    });

    const providerRequested = !!req.provider;
    const canExecuteProvider = providerRequested && (req.preview?.providerAvailable ?? false);
    // No provider calendar-write connector exists; never write externally here.
    const status = canExecuteProvider ? "provider_unavailable" : "executed";
    const resultSummary = providerRequested
      ? "Provider execution unavailable (no calendar-write connector / OAuth configured). Local hold created instead. No external event written and no attendees notified."
      : "Local calendar hold created. No external calendar write and no notifications.";

    await prisma.calendarWriteRequest.update({
      where: { id }, data: { status, executedAt: new Date(), resultSummary },
    });
    await logAudit("calendar_write_request_executed", "CalendarWriteRequest", id, { status, provider: req.provider });
    revalidatePath("/calendar/write-requests");
    revalidatePath("/calendar/planner");
    return { success: true, status, resultSummary };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

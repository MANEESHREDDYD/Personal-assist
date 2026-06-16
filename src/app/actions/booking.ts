"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { expandDailyRules, type Interval } from "@/lib/scheduling/engine";
import { generateBookingSlots } from "@/lib/booking/slotGenerator";
import { evaluateRouting } from "@/lib/booking/routing";
import { validateAnswers, slugify } from "@/lib/booking/bookingRequests";
import { buildBookingDraft } from "@/lib/booking/confirmationDrafts";
import type { BookingQuestionDef, RoutingRuleDef, BookingAnswers } from "@/lib/booking/types";
import { getWorkingHours, getSchedulingPreferences, createCalendarWriteRequest } from "@/app/actions/scheduling";

// ---- Meeting types -------------------------------------------------------

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let n = 1;
  while (await prisma.meetingType.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${++n}`;
  }
  return slug;
}

export async function createMeetingType(input: {
  title: string; description?: string; durationMins: number;
  bufferBeforeMins?: number; bufferAfterMins?: number; locationType?: string;
  locationValue?: string; minNoticeMins?: number; maxPerDay?: number;
}) {
  try {
    if (!input.title?.trim()) return { success: false, error: "Title is required." };
    const slug = await uniqueSlug(input.title);
    const mt = await prisma.meetingType.create({
      data: {
        title: input.title.trim(), slug, description: input.description || null,
        durationMins: input.durationMins || 30,
        bufferBeforeMins: input.bufferBeforeMins ?? 0, bufferAfterMins: input.bufferAfterMins ?? 0,
        locationType: input.locationType || "custom", locationValue: input.locationValue || null,
        minNoticeMins: input.minNoticeMins ?? 120, maxPerDay: input.maxPerDay ?? 5,
      },
    });
    await logAudit("meeting_type_created", "MeetingType", mt.id, { slug });
    revalidatePath("/booking/admin/meeting-types");
    return { success: true, id: mt.id, slug };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function setMeetingTypeActive(id: string, active: boolean) {
  try {
    await prisma.meetingType.update({ where: { id }, data: { active } });
    revalidatePath("/booking/admin/meeting-types");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function deleteMeetingType(id: string) {
  try {
    await prisma.meetingType.delete({ where: { id } });
    revalidatePath("/booking/admin/meeting-types");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function addBookingQuestion(meetingTypeId: string, q: BookingQuestionDef) {
  try {
    const count = await prisma.bookingQuestion.count({ where: { meetingTypeId } });
    await prisma.bookingQuestion.create({
      data: {
        meetingTypeId, label: q.label, type: q.type, required: q.required,
        optionsJson: q.options ? JSON.stringify(q.options) : null, order: count,
      },
    });
    revalidatePath("/booking/admin/meeting-types");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function addRoutingRule(meetingTypeId: string, r: RoutingRuleDef) {
  try {
    await prisma.bookingRoutingRule.create({
      data: {
        meetingTypeId, label: r.label, questionLabel: r.questionLabel || null,
        op: r.op, value: r.value || null, routeTo: r.routeTo, priority: r.priority ?? 0,
      },
    });
    revalidatePath("/booking/admin/meeting-types");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Booking pages -------------------------------------------------------

export async function createBookingPage(input: {
  title: string; description?: string; ownerName?: string; timezone?: string; meetingTypeIds?: string[];
}) {
  try {
    let slug = slugify(input.title);
    let n = 1;
    while (await prisma.bookingPage.findUnique({ where: { slug } })) slug = `${slugify(input.title)}-${++n}`;
    const page = await prisma.bookingPage.create({
      data: {
        slug, title: input.title.trim(), description: input.description || null,
        ownerName: input.ownerName || null, timezone: input.timezone || "UTC",
        meetingTypeIdsJson: input.meetingTypeIds ? JSON.stringify(input.meetingTypeIds) : null,
      },
    });
    await logAudit("booking_page_created", "BookingPage", page.id, { slug });
    revalidatePath("/booking/admin/pages");
    return { success: true, slug };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Busy intervals for booking ------------------------------------------

async function getBookingBusy(rangeStart: number, rangeEnd: number, timezone: string): Promise<Interval[]> {
  const startD = new Date(rangeStart);
  const endD = new Date(rangeEnd);
  const [events, holds, blocks, dns, prefs] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { startDate: { lt: endD }, endDate: { gt: startD } } }),
    prisma.calendarHold.findMany({ where: { status: { in: ["held", "promoted"] }, start: { lt: endD }, end: { gt: startD } } }),
    prisma.timeBlock.findMany({ where: { start: { lt: endD }, end: { gt: startD } } }),
    prisma.availabilityRule.findMany({ where: { kind: "do_not_schedule", enabled: true } }),
    getSchedulingPreferences(),
  ]);
  const explicit: Interval[] = [
    ...events.filter((e) => e.startDate && e.endDate).map((e) => ({ start: e.startDate!.getTime(), end: e.endDate!.getTime() })),
    ...holds.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() })),
    ...blocks.map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
  ];
  const dailyRules = [
    ...(prefs.lunchStartMinute != null && prefs.lunchEndMinute != null ? [{ startMinute: prefs.lunchStartMinute, endMinute: prefs.lunchEndMinute }] : []),
    ...dns.map((r) => ({ dayOfWeek: r.dayOfWeek, startMinute: r.startMinute, endMinute: r.endMinute })),
  ];
  return [...explicit, ...expandDailyRules(rangeStart, rangeEnd, dailyRules, timezone)];
}

export async function getMeetingTypeSlots(input: { slug: string; rangeStart: string; rangeEnd: string }) {
  try {
    const mt = await prisma.meetingType.findUnique({ where: { slug: input.slug }, include: { questions: { orderBy: { order: "asc" } } } });
    if (!mt || !mt.active) return { success: false, error: "Meeting type not found or inactive." };
    const wh = await getWorkingHours();
    const rangeStart = new Date(input.rangeStart).getTime();
    const rangeEnd = new Date(input.rangeEnd).getTime();
    const busy = await getBookingBusy(rangeStart, rangeEnd, wh.timezone);
    const slots = generateBookingSlots({
      meetingType: {
        durationMins: mt.durationMins, bufferBeforeMins: mt.bufferBeforeMins,
        bufferAfterMins: mt.bufferAfterMins, minNoticeMins: mt.minNoticeMins, maxPerDay: mt.maxPerDay,
      },
      workingDays: wh.days, busy, timezone: wh.timezone, rangeStart, rangeEnd,
    });
    return {
      success: true, timezone: wh.timezone,
      meetingType: {
        id: mt.id, title: mt.title, description: mt.description, durationMins: mt.durationMins,
        locationType: mt.locationType, locationValue: mt.locationValue,
        questions: mt.questions.map((q) => ({ label: q.label, type: q.type, required: q.required, options: q.optionsJson ? JSON.parse(q.optionsJson) : undefined })),
      },
      slots: slots.slice(0, 30).map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
    };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Booking request flow ------------------------------------------------

export async function submitBookingRequest(input: {
  slug: string; slotStart: string; slotEnd: string;
  invitee: { name: string; email?: string; phone?: string };
  answers: BookingAnswers;
}) {
  try {
    const mt = await prisma.meetingType.findUnique({
      where: { slug: input.slug },
      include: { questions: { orderBy: { order: "asc" } }, routingRules: true },
    });
    if (!mt || !mt.active) return { success: false, error: "Meeting type not found or inactive." };
    if (!input.invitee?.name?.trim()) return { success: false, error: "Your name is required." };

    const questionDefs: BookingQuestionDef[] = mt.questions.map((q) => ({
      label: q.label, type: q.type as BookingQuestionDef["type"], required: q.required,
      options: q.optionsJson ? JSON.parse(q.optionsJson) : undefined,
    }));
    const errors = validateAnswers(questionDefs, input.answers || {});
    if (errors.length) return { success: false, error: errors.map((e) => `${e.label}: ${e.message}`).join("; "), validationErrors: errors };

    const routingDefs: RoutingRuleDef[] = mt.routingRules.map((r) => ({
      label: r.label, questionLabel: r.questionLabel, op: r.op as RoutingRuleDef["op"], value: r.value, routeTo: r.routeTo, priority: r.priority, enabled: r.enabled,
    }));
    const routing = evaluateRouting(routingDefs, input.answers || {});

    const req = await prisma.bookingRequest.create({
      data: {
        meetingTypeId: mt.id,
        slotStart: new Date(input.slotStart), slotEnd: new Date(input.slotEnd),
        status: "pending",
        answersJson: JSON.stringify(input.answers || {}),
        routedTo: routing.routedTo, routingReason: routing.reason,
        invitees: { create: { name: input.invitee.name.trim(), email: input.invitee.email || null, phone: input.invitee.phone || null, isPrimary: true } },
      },
    });
    await logAudit("booking_request_created", "BookingRequest", req.id, { meetingType: mt.slug, routedTo: routing.routedTo });
    revalidatePath("/booking/requests");
    // No confirmation email is sent and no provider event is written here.
    return { success: true, id: req.id };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function approveBookingRequest(id: string) {
  try {
    const req = await prisma.bookingRequest.findUnique({
      where: { id }, include: { meetingType: true, invitees: true },
    });
    if (!req) return { success: false, error: "Not found" };
    if (req.status !== "pending") return { success: false, error: `Cannot approve from status ${req.status}` };

    // Approval creates an approval-gated CalendarWriteRequest (Phase 6A) — never a
    // silent provider event. Provider execution stays unavailable until OAuth exists.
    const cwr = await createCalendarWriteRequest({
      action: "create_event",
      title: `${req.meetingType.title} — ${req.invitees[0]?.name ?? "Invitee"}`,
      start: req.slotStart.toISOString(), end: req.slotEnd.toISOString(),
      timezone: req.timezone,
      attendees: req.invitees.map((i) => ({ name: i.name, email: i.email ?? undefined })),
      provider: null, notifyAttendees: false,
    });

    // Generate a LOCAL confirmation draft (not sent).
    const draft = buildBookingDraft("confirmation", {
      meetingTypeTitle: req.meetingType.title,
      inviteeName: req.invitees[0]?.name ?? "there",
      slotStart: req.slotStart, slotEnd: req.slotEnd, timezone: req.timezone,
      location: req.meetingType.locationValue || req.meetingType.locationType,
    });
    await prisma.bookingConfirmationDraft.create({
      data: { bookingRequestId: req.id, kind: "confirmation", subject: draft.subject, body: draft.body },
    });

    await prisma.bookingRequest.update({
      where: { id }, data: { status: "approved", calendarWriteRequestId: cwr.id ?? null },
    });
    await logAudit("booking_request_approved", "BookingRequest", id, { calendarWriteRequestId: cwr.id });
    revalidatePath("/booking/requests");
    revalidatePath(`/booking/requests/${id}`);
    return { success: true, calendarWriteRequestId: cwr.id };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function rejectBookingRequest(id: string) {
  try {
    await prisma.bookingRequest.update({ where: { id }, data: { status: "rejected" } });
    await logAudit("booking_request_rejected", "BookingRequest", id, {});
    revalidatePath("/booking/requests");
    revalidatePath(`/booking/requests/${id}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function generateBookingDraft(requestId: string, kind: "confirmation" | "reminder" | "follow_up") {
  try {
    const req = await prisma.bookingRequest.findUnique({ where: { id: requestId }, include: { meetingType: true, invitees: true } });
    if (!req) return { success: false, error: "Not found" };
    const draft = buildBookingDraft(kind, {
      meetingTypeTitle: req.meetingType.title, inviteeName: req.invitees[0]?.name ?? "there",
      slotStart: req.slotStart, slotEnd: req.slotEnd, timezone: req.timezone,
      location: req.meetingType.locationValue || req.meetingType.locationType,
    });
    await prisma.bookingConfirmationDraft.create({ data: { bookingRequestId: req.id, kind, subject: draft.subject, body: draft.body } });
    await logAudit("booking_draft_generated", "BookingRequest", requestId, { kind });
    revalidatePath(`/booking/requests/${requestId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

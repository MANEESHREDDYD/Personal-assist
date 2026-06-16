"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { computeFreeSlots, expandDailyRules, type Interval } from "@/lib/scheduling/engine";
import { parseSchedulingCommand } from "@/lib/schedulingSecretary/parser";
import { rankCandidateSlots } from "@/lib/schedulingSecretary/slotRanking";
import { buildSchedulingReply } from "@/lib/schedulingSecretary/draftGenerator";
import { initialStatus } from "@/lib/schedulingSecretary/conversations";
import { computeFollowUpDueAt } from "@/lib/schedulingSecretary/followUps";
import type { ReplyKind } from "@/lib/schedulingSecretary/types";
import { getWorkingHours, getSchedulingPreferences, createCalendarWriteRequest } from "@/app/actions/scheduling";

const SLOT_INTENTS = new Set(["schedule", "propose_times", "reschedule", "hold_time"]);

// ---- Parse a command into a conversation ---------------------------------

export async function parseSchedulingInstruction(input: { text: string; sourceType?: string; sourceRef?: string }) {
  try {
    const text = (input.text || "").trim();
    if (!text) return { success: false, error: "Enter a scheduling request." };
    const parsed = parseSchedulingCommand(text, Date.now());

    const title = parsed.topic
      ? `${parsed.topic}${parsed.participants[0] ? ` with ${parsed.participants[0].name}` : ""}`
      : parsed.participants[0]
        ? `Meeting with ${parsed.participants[0].name}`
        : "Scheduling request";

    const convo = await prisma.schedulingConversation.create({
      data: {
        title, intent: parsed.intent, status: initialStatus(parsed.intent, parsed.confidence),
        sourceType: input.sourceType || "command", sourceRef: input.sourceRef || null,
        instruction: {
          create: {
            rawText: text, intent: parsed.intent, durationMins: parsed.durationMins ?? null,
            rangeStart: parsed.rangeStart ? new Date(parsed.rangeStart) : null,
            rangeEnd: parsed.rangeEnd ? new Date(parsed.rangeEnd) : null,
            timePreference: parsed.timePreference, topic: parsed.topic ?? null,
            locationPref: parsed.locationPref ?? null, urgency: parsed.urgency,
            followUpHours: parsed.followUpHours ?? null, proposeCount: parsed.proposeCount ?? null,
            parserConfidence: parsed.confidence, parsedJson: JSON.stringify(parsed),
          },
        },
        participants: { create: parsed.participants.map((p, i) => ({ name: p.name, email: p.email ?? null, role: i === 0 ? "invitee" : "optional" })) },
        negotiation: { create: { state: "idle" } },
      },
    });
    await logAudit("scheduling_instruction_parsed", "SchedulingConversation", convo.id, { intent: parsed.intent });
    revalidatePath("/assistant/scheduling");
    return { success: true, id: convo.id, parsed };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Busy intervals (local only) -----------------------------------------

async function getBusy(rangeStart: number, rangeEnd: number, timezone: string): Promise<Interval[]> {
  const startD = new Date(rangeStart), endD = new Date(rangeEnd);
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
  const daily = [
    ...(prefs.lunchStartMinute != null && prefs.lunchEndMinute != null ? [{ startMinute: prefs.lunchStartMinute, endMinute: prefs.lunchEndMinute }] : []),
    ...dns.map((r) => ({ dayOfWeek: r.dayOfWeek, startMinute: r.startMinute, endMinute: r.endMinute })),
  ];
  return [...explicit, ...expandDailyRules(rangeStart, rangeEnd, daily, timezone)];
}

// ---- Generate candidate slots --------------------------------------------

export async function generateCandidateSlots(conversationId: string) {
  try {
    const convo = await prisma.schedulingConversation.findUnique({ where: { id: conversationId }, include: { instruction: true } });
    if (!convo?.instruction) return { success: false, error: "Conversation not found." };
    if (!SLOT_INTENTS.has(convo.intent)) {
      return { success: false, error: `Intent "${convo.intent}" does not require candidate slots.` };
    }
    const inst = convo.instruction;
    const wh = await getWorkingHours();
    const prefs = await getSchedulingPreferences();
    const rangeStart = inst.rangeStart?.getTime() ?? Date.now();
    const rangeEnd = inst.rangeEnd?.getTime() ?? Date.now() + 7 * 86_400_000;
    const busy = await getBusy(rangeStart, rangeEnd, wh.timezone);

    const free = computeFreeSlots({
      durationMins: inst.durationMins ?? 30, rangeStart, rangeEnd,
      workingDays: wh.days, busy, timezone: wh.timezone,
      bufferBeforeMins: prefs.bufferBeforeMins, bufferAfterMins: prefs.bufferAfterMins,
      slotGranularityMins: prefs.slotGranularityMins, minNoticeMins: prefs.minNoticeMins,
      maxPerDay: prefs.maxMeetingsPerDay, preferMornings: true,
    });
    const ranked = rankCandidateSlots({
      slots: free, timePreference: inst.timePreference as "morning" | "afternoon" | "evening" | "any",
      urgency: (inst.urgency as "low" | "normal" | "high") ?? "normal",
      limit: inst.proposeCount ?? 3,
    });

    await prisma.schedulingCandidateSlot.deleteMany({ where: { conversationId } });
    for (const s of ranked) {
      await prisma.schedulingCandidateSlot.create({
        data: { conversationId, start: new Date(s.start), end: new Date(s.end), score: s.rankScore, reason: s.reason },
      });
    }
    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "slots_generated" } });
    await logAudit("scheduling_slots_generated", "SchedulingConversation", conversationId, { count: ranked.length, totalFree: free.length });
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    return { success: true, count: ranked.length, totalFree: free.length };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Reply drafts (local only) -------------------------------------------

export async function generateReplyDraft(conversationId: string, kind: ReplyKind) {
  try {
    const convo = await prisma.schedulingConversation.findUnique({
      where: { id: conversationId },
      include: { instruction: true, participants: true, candidateSlots: { orderBy: { score: "desc" } } },
    });
    if (!convo?.instruction) return { success: false, error: "Conversation not found." };
    const wh = await getWorkingHours();
    const draft = buildSchedulingReply(kind, {
      topic: convo.instruction.topic || convo.title,
      participants: convo.participants.map((p) => ({ name: p.name, email: p.email ?? undefined })),
      candidateSlots: convo.candidateSlots.map((s) => ({ start: s.start, end: s.end })),
      timezone: wh.timezone, location: convo.instruction.locationPref,
      followUpHours: convo.instruction.followUpHours,
    });
    await prisma.schedulingReplyDraft.create({ data: { conversationId, kind, subject: draft.subject, body: draft.body } });
    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "draft_ready" } });
    await logAudit("scheduling_reply_draft_generated", "SchedulingConversation", conversationId, { kind });
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

/** Saves a scheduling reply draft into the local EmailDraft system (status draft, never sent). */
export async function saveReplyAsEmailDraft(replyDraftId: string) {
  try {
    const reply = await prisma.schedulingReplyDraft.findUnique({ where: { id: replyDraftId }, include: { conversation: { include: { participants: true } } } });
    if (!reply) return { success: false, error: "Reply draft not found." };
    const to = reply.conversation.participants.map((p) => p.email).filter(Boolean).join(", ");
    const ed = await prisma.emailDraft.create({
      data: {
        type: "new_email", to: to || null, subject: reply.subject, body: reply.body,
        status: "draft", aiGenerated: true,
        metadata: JSON.stringify({ source: "scheduling_secretary", conversationId: reply.conversationId, kind: reply.kind }),
      },
    });
    await prisma.schedulingReplyDraft.update({ where: { id: replyDraftId }, data: { emailDraftId: ed.id } });
    await logAudit("scheduling_reply_saved_as_email_draft", "EmailDraft", ed.id, { conversationId: reply.conversationId });
    revalidatePath(`/assistant/scheduling/${reply.conversationId}`);
    return { success: true, emailDraftId: ed.id };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Slot selection + calendar request -----------------------------------

export async function selectCandidateSlot(conversationId: string, slotId: string) {
  try {
    await prisma.schedulingCandidateSlot.updateMany({ where: { conversationId }, data: { selected: false } });
    await prisma.schedulingCandidateSlot.update({ where: { id: slotId }, data: { selected: true } });
    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "ready_to_schedule" } });
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function createCalendarRequestFromConversation(conversationId: string) {
  try {
    const convo = await prisma.schedulingConversation.findUnique({
      where: { id: conversationId },
      include: { instruction: true, participants: true, candidateSlots: { where: { selected: true }, take: 1 } },
    });
    if (!convo) return { success: false, error: "Conversation not found." };
    const slot = convo.candidateSlots[0];
    if (!slot) return { success: false, error: "Select a candidate slot first." };

    const cwr = await createCalendarWriteRequest({
      action: "create_event",
      title: convo.title,
      start: slot.start.toISOString(), end: slot.end.toISOString(),
      attendees: convo.participants.map((p) => ({ name: p.name, email: p.email ?? undefined })),
      provider: null, notifyAttendees: false,
    });

    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "calendar_request_created", calendarWriteRequestId: cwr.id ?? null } });
    await prisma.schedulingDecision.create({ data: { conversationId, decision: "request_created", detail: `CalendarWriteRequest ${cwr.id}` } });
    await logAudit("scheduling_calendar_request_created", "SchedulingConversation", conversationId, { calendarWriteRequestId: cwr.id });
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    return { success: true, calendarWriteRequestId: cwr.id };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

// ---- Follow-ups ----------------------------------------------------------

export async function createFollowUpRule(conversationId: string, intervalHours?: number) {
  try {
    const convo = await prisma.schedulingConversation.findUnique({ where: { id: conversationId }, include: { instruction: true } });
    if (!convo) return { success: false, error: "Conversation not found." };
    const hours = intervalHours ?? convo.instruction?.followUpHours ?? 24;
    const dueAt = new Date(computeFollowUpDueAt(Date.now(), hours));
    await prisma.schedulingFollowUpRule.create({ data: { conversationId, intervalHours: hours, dueAt } });
    await prisma.schedulingNegotiationState.update({ where: { conversationId }, data: { state: "waiting", waitingSince: new Date() } }).catch(() => {});
    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "waiting_on_recipient" } });
    await logAudit("scheduling_follow_up_created", "SchedulingConversation", conversationId, { hours });
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    revalidatePath("/assistant/scheduling/follow-ups");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

export async function cancelConversation(conversationId: string) {
  try {
    await prisma.schedulingConversation.update({ where: { id: conversationId }, data: { status: "canceled" } });
    await logAudit("scheduling_conversation_canceled", "SchedulingConversation", conversationId, {});
    revalidatePath(`/assistant/scheduling/${conversationId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error)?.message };
  }
}

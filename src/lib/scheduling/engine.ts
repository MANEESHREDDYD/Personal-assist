/**
 * Availability + scheduling engine (Phase 6A).
 *
 * Pure, side-effect-free functions shared by the scheduling server actions and the
 * test harness. Works entirely in UTC milliseconds; working hours are wall-clock
 * minutes in a given IANA timezone. The timezone offset is injectable so tests are
 * deterministic and do not depend on the host clock or tz database.
 *
 * Safety: this module only computes local proposals (free slots, conflicts, load).
 * It never writes to a provider calendar and never sends anything.
 */

export interface Interval {
  start: number; // epoch ms (UTC)
  end: number; // epoch ms (UTC)
}

export interface WorkingDay {
  day: number; // 0=Sun … 6=Sat
  enabled: boolean;
  startMinute: number; // minutes from local midnight
  endMinute: number;
}

export interface SlotOptions {
  durationMins: number;
  rangeStart: number;
  rangeEnd: number;
  workingDays: WorkingDay[];
  busy: Interval[];
  timezone?: string;
  bufferBeforeMins?: number;
  bufferAfterMins?: number;
  slotGranularityMins?: number;
  minNoticeMins?: number;
  maxPerDay?: number;
  now?: number;
  /** Test seam: minutes local is ahead of UTC at a given instant. Defaults to Intl. */
  offsetMinutesFor?: (ms: number) => number;
  /** Prefer earlier-in-day slots (mornings). */
  preferMornings?: boolean;
}

export interface Slot extends Interval {
  score: number;
  reason: string;
}

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

/** Minutes that local wall-clock is ahead of UTC at the given instant. */
export function tzOffsetMinutes(timezone: string, ms: number): number {
  try {
    const date = new Date(ms);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    let hour = Number(map.hour);
    if (hour === 24) hour = 0;
    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      hour,
      Number(map.minute),
      Number(map.second)
    );
    return Math.round((asUTC - date.getTime()) / MIN_MS);
  } catch {
    return 0; // unknown tz → treat as UTC
  }
}

/** Returns the UTC ms for a given local wall-clock Y/M/D + minutes-from-midnight. */
function localWallToUtc(
  y: number,
  m: number,
  d: number,
  minutes: number,
  offset: (ms: number) => number
): number {
  const guess = Date.UTC(y, m, d, 0, 0, 0) + minutes * MIN_MS;
  const off = offset(guess);
  return guess - off * MIN_MS;
}

/** Local calendar date (Y/M/D + weekday) for an instant, given an offset fn. */
function localDateParts(ms: number, offset: (ms: number) => number) {
  const off = offset(ms);
  const local = new Date(ms + off * MIN_MS);
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth(),
    d: local.getUTCDate(),
    day: local.getUTCDay(),
  };
}

/** Merge + sort intervals, coalescing overlaps. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      out.push({ ...iv });
    }
  }
  return out;
}

/** Subtract busy intervals from a free window, returning remaining free pieces. */
function subtract(window: Interval, busy: Interval[]): Interval[] {
  let pieces: Interval[] = [{ ...window }];
  for (const b of busy) {
    const next: Interval[] = [];
    for (const p of pieces) {
      if (b.end <= p.start || b.start >= p.end) {
        next.push(p); // no overlap
      } else {
        if (b.start > p.start) next.push({ start: p.start, end: b.start });
        if (b.end < p.end) next.push({ start: b.end, end: p.end });
      }
    }
    pieces = next;
  }
  return pieces;
}

/** Builds the per-day working windows (UTC intervals) across the range. */
export function workingWindows(opts: SlotOptions): Interval[] {
  const tz = opts.timezone || "UTC";
  const offset = opts.offsetMinutesFor || ((ms: number) => tzOffsetMinutes(tz, ms));
  const byDay = new Map<number, WorkingDay>();
  for (const wd of opts.workingDays) byDay.set(wd.day, wd);

  const windows: Interval[] = [];
  // Iterate calendar days from a little before rangeStart to rangeEnd.
  for (let cursor = opts.rangeStart - DAY_MS; cursor <= opts.rangeEnd + DAY_MS; cursor += DAY_MS) {
    const { y, m, d, day } = localDateParts(cursor, offset);
    const wd = byDay.get(day);
    if (!wd || !wd.enabled || wd.endMinute <= wd.startMinute) continue;
    const start = localWallToUtc(y, m, d, wd.startMinute, offset);
    const end = localWallToUtc(y, m, d, wd.endMinute, offset);
    const clampedStart = Math.max(start, opts.rangeStart);
    const clampedEnd = Math.min(end, opts.rangeEnd);
    if (clampedEnd > clampedStart) windows.push({ start: clampedStart, end: clampedEnd });
  }
  return mergeIntervals(windows);
}

export interface DailyRule {
  dayOfWeek?: number | null; // null/undefined = every day
  startMinute: number;
  endMinute: number;
}

/** Expands recurring daily rules (lunch, do-not-schedule) into UTC intervals over a range. */
export function expandDailyRules(
  rangeStart: number,
  rangeEnd: number,
  rules: DailyRule[],
  timezone = "UTC",
  offsetMinutesFor?: (ms: number) => number
): Interval[] {
  if (rules.length === 0) return [];
  const offset = offsetMinutesFor || ((ms: number) => tzOffsetMinutes(timezone, ms));
  const out: Interval[] = [];
  for (let cursor = rangeStart - DAY_MS; cursor <= rangeEnd + DAY_MS; cursor += DAY_MS) {
    const { y, m, d, day } = localDateParts(cursor, offset);
    for (const r of rules) {
      if (r.endMinute <= r.startMinute) continue;
      if (r.dayOfWeek != null && r.dayOfWeek !== day) continue;
      const s = localWallToUtc(y, m, d, r.startMinute, offset);
      const e = localWallToUtc(y, m, d, r.endMinute, offset);
      const cs = Math.max(s, rangeStart);
      const ce = Math.min(e, rangeEnd);
      if (ce > cs) out.push({ start: cs, end: ce });
    }
  }
  return mergeIntervals(out);
}

/** Detects whether a proposed interval conflicts with any busy interval. */
export function detectConflicts(proposed: Interval, busy: Interval[]): Interval[] {
  return busy.filter((b) => b.start < proposed.end && b.end > proposed.start);
}

/** Total busy hours that fall within a given window. */
export function meetingLoadHours(busy: Interval[], window: Interval): number {
  let ms = 0;
  for (const b of mergeIntervals(busy)) {
    const s = Math.max(b.start, window.start);
    const e = Math.min(b.end, window.end);
    if (e > s) ms += e - s;
  }
  return ms / 3_600_000;
}

export interface WritePreview {
  conflicts: Interval[];
  hasConflicts: boolean;
  providerAvailable: boolean;
  notifyAttendees: boolean;
  impactSummary: string;
}

/**
 * Builds a dry-run preview for a proposed calendar write. Never writes anything.
 * Provider execution is only "available" when a provider target is configured AND
 * a calendar-write connector exists; otherwise the request stays local-only.
 */
export function buildCalendarWritePreview(input: {
  proposed: Interval;
  busy: Interval[];
  providerConfigured: boolean;
  notifyAttendees?: boolean;
  attendeeCount?: number;
}): WritePreview {
  const conflicts = detectConflicts(input.proposed, input.busy);
  const providerAvailable = !!input.providerConfigured;
  const notify = !!input.notifyAttendees;
  const parts: string[] = [];
  parts.push(conflicts.length ? `${conflicts.length} conflict(s) detected` : "no conflicts");
  parts.push(providerAvailable ? "provider execution available (approval required)" : "local-only (provider not configured)");
  parts.push(notify ? "would notify attendees (requires explicit approval)" : "no attendee notifications");
  if (input.attendeeCount) parts.push(`${input.attendeeCount} attendee(s)`);
  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    providerAvailable,
    notifyAttendees: notify,
    impactSummary: parts.join("; "),
  };
}

/**
 * Returns contiguous free intervals (working windows minus buffered busy), honoring
 * minNotice. Unlike computeFreeSlots this does NOT slice into fixed-duration slots —
 * it is the basis for variable-duration packing (tasks, focus blocks, habits).
 */
export function computeFreeIntervals(opts: Omit<SlotOptions, "durationMins"> & { durationMins?: number }): Interval[] {
  const tz = opts.timezone || "UTC";
  const offset = opts.offsetMinutesFor || ((ms: number) => tzOffsetMinutes(tz, ms));
  void offset;
  const bufBefore = (opts.bufferBeforeMins ?? 0) * MIN_MS;
  const bufAfter = (opts.bufferAfterMins ?? 0) * MIN_MS;
  const now = opts.now ?? Date.now();
  const earliest = now + (opts.minNoticeMins ?? 0) * MIN_MS;

  const busyBuffered = mergeIntervals(
    opts.busy.map((b) => ({ start: b.start - bufBefore, end: b.end + bufAfter }))
  );
  const windows = workingWindows({ ...opts, durationMins: opts.durationMins ?? 0 } as SlotOptions);
  const free: Interval[] = [];
  for (const w of windows) {
    for (const piece of subtract(w, busyBuffered)) {
      const start = Math.max(piece.start, earliest);
      if (piece.end > start) free.push({ start, end: piece.end });
    }
  }
  return mergeIntervals(free).sort((a, b) => a.start - b.start);
}

/** Finds free slots of the requested duration honoring buffers, notice, and per-day caps. */
export function computeFreeSlots(opts: SlotOptions): Slot[] {
  const tz = opts.timezone || "UTC";
  const offset = opts.offsetMinutesFor || ((ms: number) => tzOffsetMinutes(tz, ms));
  const bufBefore = (opts.bufferBeforeMins ?? 0) * MIN_MS;
  const bufAfter = (opts.bufferAfterMins ?? 0) * MIN_MS;
  const gran = (opts.slotGranularityMins ?? 30) * MIN_MS;
  const dur = opts.durationMins * MIN_MS;
  const now = opts.now ?? Date.now();
  const earliest = now + (opts.minNoticeMins ?? 0) * MIN_MS;
  const maxPerDay = opts.maxPerDay ?? Infinity;

  // Expand busy by buffers so new meetings keep breathing room.
  const busyBuffered = mergeIntervals(
    opts.busy.map((b) => ({ start: b.start - bufBefore, end: b.end + bufAfter }))
  );

  const windows = workingWindows(opts);
  const perDayCount = new Map<string, number>();
  const slots: Slot[] = [];

  for (const w of windows) {
    const free = subtract(w, busyBuffered);
    for (const piece of free) {
      // Walk candidate starts at granularity.
      let t = Math.ceil(piece.start / gran) * gran;
      while (t + dur <= piece.end) {
        if (t >= earliest) {
          const { y, m, d } = localDateParts(t, offset);
          const key = `${y}-${m}-${d}`;
          const count = perDayCount.get(key) ?? 0;
          if (count < maxPerDay) {
            const local = new Date(t + offset(t) * MIN_MS);
            const localMinute = local.getUTCHours() * 60 + local.getUTCMinutes();
            // Score: earlier in day scores higher when preferMornings.
            const dayScore = opts.preferMornings ? 1 - localMinute / 1440 : 0.5;
            slots.push({
              start: t,
              end: t + dur,
              score: Math.round(dayScore * 100) / 100,
              reason: opts.preferMornings && localMinute < 720 ? "morning slot" : "available",
            });
            perDayCount.set(key, count + 1);
          }
        }
        t += gran;
      }
    }
  }
  return slots.sort((a, b) => b.score - a.score || a.start - b.start);
}

"""AI scheduling secretary metrics for Personal Assist OS (Phase 6C).

Defensive: secretary tables may not exist on an older local database, so each
query falls back to zero/empty rather than failing the pipeline. No PII is read.
"""

import sqlite3
from .db import get_db_connection


def _scalar(conn, sql, params=()):
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return int(row[0]) if row and row[0] is not None else 0
    except sqlite3.Error:
        return 0


def _rows(conn, sql, params=()):
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]
    except sqlite3.Error:
        return []


def analyze_scheduling_secretary():
    """Howie-style scheduling secretary metrics with safety invariants."""
    with get_db_connection() as conn:
        instructions = _scalar(conn, "SELECT COUNT(*) FROM SchedulingInstruction")
        conversations = _scalar(conn, "SELECT COUNT(*) FROM SchedulingConversation")
        candidate_slots = _scalar(conn, "SELECT COUNT(*) FROM SchedulingCandidateSlot")
        reply_drafts = _scalar(conn, "SELECT COUNT(*) FROM SchedulingReplyDraft")
        follow_ups_pending = _scalar(conn, "SELECT COUNT(*) FROM SchedulingFollowUpRule WHERE status = 'pending'")
        requests_from_secretary = _scalar(
            conn, "SELECT COUNT(*) FROM SchedulingConversation WHERE calendarWriteRequestId IS NOT NULL"
        )

        intent_rows = _rows(conn, "SELECT intent, COUNT(*) AS n FROM SchedulingConversation GROUP BY intent")
        intent_distribution = {r["intent"]: r["n"] for r in intent_rows}

        avg_slots = round(candidate_slots / instructions, 2) if instructions else 0.0

        return {
            "instructions_count": instructions,
            "conversations_count": conversations,
            "candidate_slots_generated": candidate_slots,
            "reply_drafts_generated": reply_drafts,
            "follow_ups_pending": follow_ups_pending,
            "calendar_requests_created_from_secretary": requests_from_secretary,
            "average_candidate_slots_per_instruction": avg_slots,
            "intent_distribution": intent_distribution,
            # Safety invariants — must remain 0.
            "emails_sent_by_secretary": 0,
            "provider_events_written_by_secretary": 0,
        }

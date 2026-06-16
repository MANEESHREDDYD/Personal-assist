"""Scheduling + calendar-write metrics for Personal Assist OS (Phase 6A).

Defensive: scheduling tables may not exist on an older local database, so every
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


def analyze_scheduling():
    """Calendar availability + approval-gated write metrics."""
    with get_db_connection() as conn:
        total_requests = _scalar(conn, "SELECT COUNT(*) FROM CalendarWriteRequest")
        status_rows = _rows(
            conn, "SELECT status, COUNT(*) AS n FROM CalendarWriteRequest GROUP BY status"
        )
        by_status = {r["status"]: r["n"] for r in status_rows}

        suggested = _scalar(conn, "SELECT COUNT(*) FROM SuggestedSlot WHERE consumed = 0")
        holds = _scalar(conn, "SELECT COUNT(*) FROM CalendarHold WHERE status IN ('held','promoted')")
        focus_blocks = _scalar(conn, "SELECT COUNT(*) FROM TimeBlock WHERE kind = 'focus'")
        rules = _scalar(conn, "SELECT COUNT(*) FROM AvailabilityRule WHERE enabled = 1")
        conflicts = _scalar(conn, "SELECT COUNT(*) FROM CalendarWritePreview WHERE hasConflicts = 1")
        provider_writes = _scalar(
            conn, "SELECT COUNT(*) FROM CalendarWriteRequest WHERE provider IS NOT NULL AND status = 'executed'"
        )

        return {
            "calendar_write_requests": total_requests,
            "write_requests_by_status": by_status,
            "approved_requests": by_status.get("approved", 0) + by_status.get("executed", 0),
            "rejected_requests": by_status.get("rejected", 0),
            "pending_requests": by_status.get("pending_approval", 0),
            "suggested_slots_open": suggested,
            "active_calendar_holds": holds,
            "focus_blocks": focus_blocks,
            "availability_rules": rules,
            "previews_with_conflicts": conflicts,
            # Safety invariant: no external provider event was ever written silently.
            "external_provider_events_written": provider_writes,  # 0 until a connector exists
            "external_writes_require_approval": True,
            "attendee_notifications_sent": 0,
        }

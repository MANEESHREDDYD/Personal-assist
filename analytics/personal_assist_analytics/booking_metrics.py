"""Booking metrics for Personal Assist OS (Phase 6B).

Defensive: booking tables may not exist on an older local database, so each query
falls back to zero/empty rather than failing the pipeline. No PII is read.
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


def analyze_booking():
    """Calendly-style booking metrics with safety invariants."""
    with get_db_connection() as conn:
        meeting_types = _scalar(conn, "SELECT COUNT(*) FROM MeetingType")
        pages = _scalar(conn, "SELECT COUNT(*) FROM BookingPage")
        routing_rules = _scalar(conn, "SELECT COUNT(*) FROM BookingRoutingRule WHERE enabled = 1")
        confirmation_drafts = _scalar(conn, "SELECT COUNT(*) FROM BookingConfirmationDraft")

        total_requests = _scalar(conn, "SELECT COUNT(*) FROM BookingRequest")
        status_rows = _rows(conn, "SELECT status, COUNT(*) AS n FROM BookingRequest GROUP BY status")
        by_status = {r["status"]: r["n"] for r in status_rows}

        # Provider events written from booking approvals (0 — provider execution
        # is unavailable; approvals only create approval-gated local write requests).
        provider_from_booking = _scalar(
            conn,
            "SELECT COUNT(*) FROM CalendarWriteRequest cwr "
            "JOIN BookingRequest br ON br.calendarWriteRequestId = cwr.id "
            "WHERE cwr.provider IS NOT NULL AND cwr.status = 'executed'",
        )

        return {
            "meeting_types_count": meeting_types,
            "booking_pages_count": pages,
            "routing_rules_count": routing_rules,
            "booking_requests_count": total_requests,
            "booking_requests_pending": by_status.get("pending", 0),
            "booking_requests_approved": by_status.get("approved", 0),
            "booking_requests_rejected": by_status.get("rejected", 0),
            "booking_confirmation_drafts_created": confirmation_drafts,
            # Safety invariants — must remain 0.
            "auto_confirmations_sent": 0,
            "provider_events_written_from_booking": provider_from_booking,
            "external_writes_require_approval": True,
        }

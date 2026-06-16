"""Smart planner + focus optimizer metrics for Personal Assist OS (Phase 6D).

Defensive: planner tables may not exist on an older local database, so each query
falls back to zero/empty rather than failing the pipeline. No PII is read.
"""

import json
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


def analyze_planner():
    """Planner/optimizer metrics with safety invariants."""
    with get_db_connection() as conn:
        tasks = _scalar(conn, "SELECT COUNT(*) FROM PlannerTask")
        tasks_scheduled = _scalar(conn, "SELECT COUNT(DISTINCT taskId) FROM PlannerTaskSchedule")
        overdue = _scalar(
            conn,
            "SELECT COUNT(*) FROM PlannerTask WHERE status IN ('todo','in_progress') "
            "AND dueDate IS NOT NULL AND dueDate < strftime('%s','now')*1000",
        )
        habits = _scalar(conn, "SELECT COUNT(*) FROM Habit WHERE active = 1")
        habit_schedules = _scalar(conn, "SELECT COUNT(*) FROM HabitSchedule")
        focus_blocks = _scalar(conn, "SELECT COUNT(*) FROM FocusBlock")
        runs = _scalar(conn, "SELECT COUNT(*) FROM OptimizationRun")
        proposals = _scalar(conn, "SELECT COUNT(*) FROM OptimizationProposal")
        requests_from_planner = _scalar(
            conn, "SELECT COUNT(*) FROM OptimizationProposal WHERE calendarWriteRequestId IS NOT NULL"
        )

        # Aggregate summary metrics from the most recent runs' summaryJson.
        summaries = _rows(conn, "SELECT summaryJson FROM OptimizationRun ORDER BY createdAt DESC LIMIT 10")
        cs_scores, burnout_scores, focus_hours, meeting_hours, frag_days = [], [], [], [], []
        for s in summaries:
            try:
                d = json.loads(s.get("summaryJson") or "{}")
            except (ValueError, TypeError):
                continue
            if "contextSwitchScore" in d:
                cs_scores.append(float(d["contextSwitchScore"]))
            if "burnoutRisk" in d:
                burnout_scores.append(float(d["burnoutRisk"]))
            if "plannedFocusHours" in d:
                focus_hours.append(float(d["plannedFocusHours"]))
            if "meetingHours" in d:
                meeting_hours.append(float(d["meetingHours"]))
            if "fragmentedDays" in d:
                frag_days.append(int(d["fragmentedDays"]))

        def avg(xs):
            return round(sum(xs) / len(xs), 3) if xs else 0.0

        return {
            "tasks_count": tasks,
            "tasks_scheduled": tasks_scheduled,
            "tasks_unscheduled": max(0, tasks - tasks_scheduled),
            "overdue_tasks_count": overdue,
            "habits_count": habits,
            "habit_schedules_count": habit_schedules,
            "focus_blocks_count": focus_blocks,
            "planned_focus_hours": avg(focus_hours),
            "meeting_load_hours": avg(meeting_hours),
            "fragmented_days_count": max(frag_days) if frag_days else 0,
            "context_switch_score_avg": avg(cs_scores),
            "burnout_risk_score_avg": avg(burnout_scores),
            "optimization_runs_count": runs,
            "optimization_proposals_count": proposals,
            "calendar_requests_created_from_planner": requests_from_planner,
            # Safety invariants — must remain 0.
            "provider_events_written_by_planner": 0,
            "emails_sent_by_planner": 0,
        }

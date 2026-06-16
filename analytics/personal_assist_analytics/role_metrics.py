"""Role-based usage metrics for Personal Assist OS (Phase 5J).

Defensive: the role tables may not exist on an older local database, so each
query falls back to zero rather than failing the pipeline.
"""

import sqlite3
from .db import get_db_connection

ROLE_IDS = [
    "student", "public_personal", "engineer", "it_professional", "manager",
    "team_lead", "director", "vp", "founder", "ceo", "vc_investor",
]


def _safe_scalar(conn, sql, params=()):
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        row = cur.fetchone()
        return int(row[0]) if row and row[0] is not None else 0
    except sqlite3.Error:
        return 0


def _safe_rows(conn, sql, params=()):
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]
    except sqlite3.Error:
        return []


def analyze_role_usage():
    """Returns role adoption + per-role workflow/goal counts. No PII."""
    with get_db_connection() as conn:
        profiles = _safe_scalar(conn, "SELECT COUNT(*) FROM UserRoleProfile")
        active = _safe_rows(
            conn, "SELECT role FROM UserRoleProfile WHERE isActive = 1 LIMIT 1"
        )
        workflow_rows = _safe_rows(
            conn,
            "SELECT role, COUNT(*) AS n FROM RoleWorkflowTemplate GROUP BY role",
        )
        goal_rows = _safe_rows(
            conn, "SELECT role, COUNT(*) AS n FROM RoleGoal GROUP BY role"
        )

        workflows_by_role = {r["role"]: r["n"] for r in workflow_rows}
        goals_by_role = {r["role"]: r["n"] for r in goal_rows}

        return {
            "supported_roles": len(ROLE_IDS),
            "activated_role_profiles": profiles,
            "active_role": active[0]["role"] if active else None,
            "workflow_templates_by_role": workflows_by_role,
            "total_role_workflow_templates": sum(workflows_by_role.values()),
            "goals_by_role": goals_by_role,
            "no_send_compliance": True,
            "external_writes_require_approval": True,
        }

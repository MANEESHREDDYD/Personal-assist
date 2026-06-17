"""Local agreement workflow metrics for Personal Assist OS (Phase 6F).

Defensive: agreement tables may not exist on an older local database, so each query
falls back to zero/empty rather than failing the pipeline. No PII is read.

LOCAL agreement / signing simulation only — not legally binding, not a DocuSign
legal/compliance replacement, not legal advice. legal_binding_claims_made stays 0.
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


def analyze_agreements():
    """Agreement workflow metrics with safety + honesty invariants."""
    with get_db_connection() as conn:
        total = _scalar(conn, "SELECT COUNT(*) FROM Agreement")
        draft = _scalar(conn, "SELECT COUNT(*) FROM Agreement WHERE status = 'draft'")
        prepared = _scalar(conn, "SELECT COUNT(*) FROM Agreement WHERE status IN ('prepared','sent_for_local_signing')")
        partial = _scalar(conn, "SELECT COUNT(*) FROM Agreement WHERE status = 'partially_signed'")
        completed = _scalar(conn, "SELECT COUNT(*) FROM Agreement WHERE status = 'completed'")
        voided = _scalar(conn, "SELECT COUNT(*) FROM Agreement WHERE status = 'voided'")
        templates = _scalar(conn, "SELECT COUNT(*) FROM AgreementTemplate")
        recipients = _scalar(conn, "SELECT COUNT(*) FROM AgreementRecipient")
        unsigned = _scalar(conn, "SELECT COUNT(*) FROM AgreementRecipient WHERE required = 1 AND status NOT IN ('signed','skipped')")
        fields = _scalar(conn, "SELECT COUNT(*) FROM AgreementField")
        certificates = _scalar(conn, "SELECT COUNT(*) FROM SigningCertificate")
        risks = _scalar(conn, "SELECT COUNT(*) FROM AgreementRisk WHERE resolved = 0")
        high_risks = _scalar(conn, "SELECT COUNT(*) FROM AgreementRisk WHERE resolved = 0 AND level IN ('high','critical')")
        renewal_dates = _scalar(conn, "SELECT COUNT(*) FROM AgreementClause WHERE kind = 'renewal_date'")
        reminders = _scalar(conn, "SELECT COUNT(*) FROM AgreementReminder")
        qas = _scalar(conn, "SELECT COUNT(*) FROM AgreementAuditEvent WHERE action = 'qa_asked'")

        return {
            "agreements_count": total,
            "agreements_draft": draft,
            "agreements_prepared": prepared,
            "agreements_partially_signed": partial,
            "agreements_completed": completed,
            "agreements_voided": voided,
            "agreement_templates_count": templates,
            "agreement_recipients_count": recipients,
            "agreement_fields_count": fields,
            "agreement_certificates_count": certificates,
            "agreement_risks_count": risks,
            "high_agreement_risks_count": high_risks,
            "unsigned_recipients_count": unsigned,
            "renewal_dates_detected": renewal_dates,
            "agreement_reminders_count": reminders,
            "agreement_qas_count": qas,
            # Safety + honesty invariants — must remain 0.
            "emails_sent_by_agreements": 0,
            "provider_events_written_by_agreements": 0,
            "legal_binding_claims_made": 0,
        }

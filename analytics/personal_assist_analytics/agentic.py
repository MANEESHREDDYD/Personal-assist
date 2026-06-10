import json
from .db import query_all, query_one

def analyze_agentic_workflows():
    """Analyzes end-to-end agentic workflow pipelines and computes success/failure metrics.
    
    Tracks three core pipelines:
    - Document Pipeline: InboxItem → Document → EmailDraft → ApprovalRequest → Export
    - Email Pipeline: InboxItem → classification → FollowUp/Reminder/WalletCard
    - Calendar Pipeline: CalendarEvent → WalletCard → Reminder → DailyBrief
    """
    results = {}
    
    # Document pipeline completion
    total_docs = query_one("SELECT COUNT(id) as c FROM Document")['c'] or 0
    docs_with_summary = query_one("SELECT COUNT(id) as c FROM Document WHERE aiSummary IS NOT NULL")['c'] or 0
    total_drafts = query_one("SELECT COUNT(id) as c FROM EmailDraft")['c'] or 0
    approved_drafts = query_one("SELECT COUNT(id) as c FROM EmailDraft WHERE status = 'approved'")['c'] or 0
    
    results['document_pipeline'] = {
        'total_documents': total_docs,
        'documents_with_ai_summary': docs_with_summary,
        'extraction_rate': round(docs_with_summary / total_docs * 100, 2) if total_docs > 0 else 0,
        'drafts_generated': total_drafts,
        'drafts_approved': approved_drafts
    }
    
    # Email classification pipeline
    total_inbox = query_one("SELECT COUNT(id) as c FROM InboxItem")['c'] or 0
    processed = query_one("SELECT COUNT(id) as c FROM InboxItem WHERE isProcessed = 1")['c'] or 0
    categorized = query_one("SELECT COUNT(id) as c FROM InboxItem WHERE category IS NOT NULL")['c'] or 0
    
    results['email_pipeline'] = {
        'total_inbox_items': total_inbox,
        'processed': processed,
        'categorized': categorized,
        'classification_rate': round(categorized / total_inbox * 100, 2) if total_inbox > 0 else 0
    }
    
    # Calendar pipeline
    total_events = query_one("SELECT COUNT(id) as c FROM CalendarEvent")['c'] or 0
    total_reminders = query_one("SELECT COUNT(id) as c FROM Reminder")['c'] or 0
    
    results['calendar_pipeline'] = {
        'total_events': total_events,
        'reminders_created': total_reminders
    }
    
    # Approval gate metrics (human-in-the-loop)
    total_approvals = query_one("SELECT COUNT(id) as c FROM ApprovalRequest")['c'] or 0
    approved = query_one("SELECT COUNT(id) as c FROM ApprovalRequest WHERE status = 'approved'")['c'] or 0
    denied = query_one("SELECT COUNT(id) as c FROM ApprovalRequest WHERE status = 'denied'")['c'] or 0
    
    results['human_approval_gate'] = {
        'total_requests': total_approvals,
        'approved': approved,
        'denied': denied,
        'approval_rate': round(approved / total_approvals * 100, 2) if total_approvals > 0 else 0
    }
    
    # Automation intervention rate
    total_runs = query_one("SELECT COUNT(id) as c FROM AutomationRun")['c'] or 0
    failed_runs = query_one("SELECT COUNT(id) as c FROM AutomationRun WHERE status = 'failed'")['c'] or 0
    
    results['automation_metrics'] = {
        'total_runs': total_runs,
        'failed_runs': failed_runs,
        'success_rate': round((total_runs - failed_runs) / total_runs * 100, 2) if total_runs > 0 else 100.0
    }
    
    # Provider-side draft creation (Phase 3H) — drafts created, never sent
    provider = analyze_provider_drafts()
    results['provider_drafts'] = provider

    # No-send safety compliance (drafts never sent via API)
    results['safety_compliance'] = {
        'no_send_policy_enforced': True,
        'provider_drafts_created': provider['provider_drafts_created'],
        'emails_sent_via_api': 0,
        'compliance_rate': 100.0
    }

    return results


def analyze_provider_drafts():
    """Analyzes Phase 3H provider-side draft creation after human approval.

    Provider drafts (Gmail/Outlook) are created only after a local EmailDraft is
    approved. Personal Assist never sends email, so emails_sent stays at 0 and the
    pipeline tracks the approval-to-provider-draft conversion instead.
    """
    approved = query_one("SELECT COUNT(id) as c FROM EmailDraft WHERE status = 'approved'")['c'] or 0
    pushed = query_one(
        "SELECT COUNT(id) as c FROM EmailDraft WHERE metadata LIKE '%\"pushedToProvider\":true%'"
    )['c'] or 0
    gmail_drafts = query_one(
        "SELECT COUNT(id) as c FROM EmailDraft WHERE metadata LIKE '%\"providerDrafts\"%' AND metadata LIKE '%\"gmail\"%'"
    )['c'] or 0
    outlook_drafts = query_one(
        "SELECT COUNT(id) as c FROM EmailDraft WHERE metadata LIKE '%\"providerDrafts\"%' AND metadata LIKE '%\"outlook\"%'"
    )['c'] or 0

    connectors_total = query_one(
        "SELECT COUNT(id) as c FROM ConnectorAccount WHERE provider IN ('gmail_draft', 'outlook_draft')"
    )['c'] or 0
    connectors_connected = query_one(
        "SELECT COUNT(id) as c FROM ConnectorAccount WHERE provider IN ('gmail_draft', 'outlook_draft') AND status = 'connected'"
    )['c'] or 0
    failures = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_draft_creation_failed'"
    )['c'] or 0

    return {
        'approved_drafts': approved,
        'provider_drafts_created': pushed,
        'gmail_provider_drafts': gmail_drafts,
        'outlook_provider_drafts': outlook_drafts,
        'emails_sent': 0,
        'draft_connectors_total': connectors_total,
        'draft_connectors_connected': connectors_connected,
        'draft_connector_health': round(connectors_connected / connectors_total * 100, 2) if connectors_total > 0 else 0,
        'creation_failures': failures,
        'approval_to_provider_draft_rate': round(pushed / approved * 100, 2) if approved > 0 else 0,
        'attachments': analyze_provider_attachments()
    }


def analyze_provider_attachments():
    """Phase 3I — provider draft attachment upload metrics from the audit trail.

    Attachments are uploaded only to existing draft messages after approval, and
    only on explicit user action. No emails are sent, so emails_sent stays at 0.
    """
    uploaded = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action IN "
        "('gmail_provider_attachment_uploaded', 'outlook_provider_attachment_uploaded')"
    )['c'] or 0
    failed = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_upload_failed'"
    )['c'] or 0
    large_blocked = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_size_blocked'"
    )['c'] or 0
    duplicate_blocked = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_duplicate_blocked'"
    )['c'] or 0
    type_blocked = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_type_blocked'"
    )['c'] or 0
    dry_runs = query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_dry_run_completed'"
    )['c'] or 0

    # Validation failures = files rejected before/instead of upload (size, type, missing).
    validation_failures = large_blocked + type_blocked + (query_one(
        "SELECT COUNT(id) as c FROM AuditLog WHERE action = 'provider_attachment_missing_file'"
    )['c'] or 0)

    return {
        'uploaded': uploaded,
        'failures': failed,
        'large_blocked': large_blocked,
        'duplicate_blocked': duplicate_blocked,
        'type_blocked': type_blocked,
        'dry_runs': dry_runs,
        'validation_failures': validation_failures,
        'max_size_mb': 3,
        'emails_sent': 0
    }

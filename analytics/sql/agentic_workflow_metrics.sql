-- agentic_workflow_metrics.sql
-- Measures end-to-end agentic pipeline completion rates.
-- Tracks document, email, and calendar pipeline health.

SELECT
    (SELECT COUNT(id) FROM InboxItem) AS total_ingested_emails,
    (SELECT COUNT(id) FROM InboxItem WHERE isProcessed = 1) AS processed_emails,
    (SELECT COUNT(id) FROM InboxItem WHERE category IS NOT NULL) AS classified_emails,
    (SELECT COUNT(id) FROM Document) AS total_documents,
    (SELECT COUNT(id) FROM Document WHERE aiSummary IS NOT NULL) AS documents_with_extraction,
    (SELECT COUNT(id) FROM EmailDraft) AS drafts_generated,
    (SELECT COUNT(id) FROM EmailDraft WHERE status = 'approved') AS drafts_approved,
    (SELECT COUNT(id) FROM ApprovalRequest) AS approval_requests,
    (SELECT COUNT(id) FROM ApprovalRequest WHERE status = 'approved') AS approvals_granted,
    (SELECT COUNT(id) FROM CalendarEvent) AS calendar_events_synced,
    (SELECT COUNT(id) FROM Reminder) AS reminders_created,
    (SELECT COUNT(id) FROM FollowUp) AS followups_created,
    (SELECT COUNT(id) FROM AutomationRun) AS automation_runs,
    (SELECT COUNT(id) FROM AutomationRun WHERE status = 'failed') AS automation_failures;

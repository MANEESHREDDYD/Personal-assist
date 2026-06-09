-- workload_metrics.sql
-- Computes user workload indicators for feature scoring.

SELECT
    (SELECT COUNT(id) FROM Reminder WHERE status = 'pending') AS pending_reminders,
    (SELECT COUNT(id) FROM FollowUp WHERE status = 'pending') AS pending_followups,
    (SELECT COUNT(id) FROM CalendarEvent WHERE startDate > datetime('now')) AS upcoming_events,
    (SELECT COUNT(id) FROM ApprovalRequest WHERE status = 'pending') AS pending_approvals,
    (SELECT COUNT(id) FROM EmailDraft WHERE status = 'draft') AS active_drafts,
    (SELECT COUNT(id) FROM Document WHERE status = 'needs_review') AS docs_awaiting_review;

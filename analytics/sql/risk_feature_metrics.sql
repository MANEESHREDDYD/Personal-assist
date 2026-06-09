-- risk_feature_metrics.sql
-- Gathers risk-relevant metrics for ML feature engineering.

SELECT
    (SELECT COUNT(id) FROM Document WHERE status = 'needs_signature') AS docs_needing_signature,
    (SELECT COUNT(id) FROM Document WHERE status = 'needs_review') AS docs_needing_review,
    (SELECT COUNT(id) FROM EmailDraft WHERE status = 'rejected') AS rejected_drafts,
    (SELECT COUNT(id) FROM ApprovalRequest WHERE status = 'denied') AS denied_approvals,
    (SELECT COUNT(id) FROM Reminder WHERE status = 'pending') AS pending_reminders,
    (SELECT COUNT(id) FROM FollowUp WHERE status = 'pending') AS pending_followups,
    (SELECT COUNT(id) FROM AutomationRun WHERE status = 'failed') AS failed_automations,
    (SELECT COUNT(id) FROM ConnectorAccount WHERE status IN ('error', 'revoked')) AS failed_connectors;

-- lineage_edges.sql
-- Counts records at each stage of the data lineage pipeline.
-- Used by lineage.py to build the lineage graph.

SELECT
    (SELECT COUNT(id) FROM ConnectorAccount) AS connector_accounts,
    (SELECT COUNT(id) FROM InboxItem) AS inbox_items,
    (SELECT COUNT(id) FROM CalendarEvent) AS calendar_events,
    (SELECT COUNT(id) FROM Document) AS documents,
    (SELECT COUNT(id) FROM EmailDraft) AS email_drafts,
    (SELECT COUNT(id) FROM ApprovalRequest) AS approval_requests,
    (SELECT COUNT(id) FROM WalletCard) AS wallet_cards,
    (SELECT COUNT(id) FROM Reminder) AS reminders,
    (SELECT COUNT(id) FROM FollowUp) AS follow_ups,
    (SELECT COUNT(id) FROM Notification) AS notifications,
    (SELECT COUNT(id) FROM AuditLog) AS audit_logs;

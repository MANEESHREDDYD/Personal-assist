-- data_quality_contracts.sql
-- Checks data contract compliance across major entities.

SELECT
    (SELECT COUNT(id) FROM InboxItem WHERE subject IS NULL OR subject = '') AS inbox_missing_subject,
    (SELECT COUNT(id) FROM InboxItem WHERE sender IS NULL OR sender = '') AS inbox_missing_sender,
    (SELECT COUNT(id) FROM CalendarEvent WHERE title IS NULL OR title = '') AS events_missing_title,
    (SELECT COUNT(id) FROM Document WHERE filename IS NULL OR filename = '') AS docs_missing_filename,
    (SELECT COUNT(id) FROM Document WHERE path IS NULL OR path = '') AS docs_missing_path,
    (SELECT COUNT(id) FROM EmailDraft WHERE subject IS NULL OR subject = '') AS drafts_missing_subject,
    (SELECT COUNT(id) FROM EmailDraft WHERE body IS NULL OR body = '') AS drafts_missing_body,
    (SELECT COUNT(id) FROM AuditLog WHERE action IS NULL OR action = '') AS audit_missing_action,
    (SELECT COUNT(id) FROM AuditLog WHERE entityType IS NULL OR entityType = '') AS audit_missing_entity_type,
    (SELECT COUNT(id) FROM ConnectorAccount WHERE status IS NULL OR status = '') AS connectors_missing_status;

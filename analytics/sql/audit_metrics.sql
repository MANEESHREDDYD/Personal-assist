-- audit_metrics.sql
SELECT 
    COUNT(id) AS total_audit_logs,
    SUM(CASE WHEN entityType = 'EmailDraft' THEN 1 ELSE 0 END) AS draft_audit_logs,
    SUM(CASE WHEN entityType = 'Document' THEN 1 ELSE 0 END) AS document_audit_logs
FROM AuditLog;

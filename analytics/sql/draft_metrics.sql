-- draft_metrics.sql
SELECT 
    COUNT(id) AS total_drafts,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_drafts,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_drafts,
    SUM(CASE WHEN status = 'needs_changes' THEN 1 ELSE 0 END) AS needs_changes_drafts,
    SUM(CASE WHEN metadata LIKE '%"exportStatus":"exported"%' THEN 1 ELSE 0 END) AS exported_drafts,
    SUM(CASE WHEN metadata LIKE '%"exportStatus":"manually_sent"%' THEN 1 ELSE 0 END) AS manually_sent_drafts
FROM EmailDraft;

-- inbox_metrics.sql
-- Computes core metrics for email ingestion and processing.

SELECT 
    COUNT(id) AS total_emails,
    SUM(CASE WHEN metadata LIKE '%gmail%' THEN 1 ELSE 0 END) AS total_gmail,
    SUM(CASE WHEN metadata LIKE '%outlook%' THEN 1 ELSE 0 END) AS total_outlook,
    SUM(CASE WHEN isProcessed = 1 THEN 1 ELSE 0 END) AS total_processed,
    COUNT(externalId) AS total_deduplicated_external_ids
FROM InboxItem;

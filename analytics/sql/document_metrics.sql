-- document_metrics.sql
SELECT 
    COUNT(id) AS total_documents,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_documents,
    SUM(CASE WHEN aiSummary IS NOT NULL THEN 1 ELSE 0 END) AS summarized_documents
FROM Document;

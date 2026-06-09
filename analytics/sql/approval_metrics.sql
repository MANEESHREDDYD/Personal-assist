-- approval_metrics.sql
SELECT 
    COUNT(id) AS total_requests,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
    SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) AS denied_requests,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_requests
FROM ApprovalRequest;

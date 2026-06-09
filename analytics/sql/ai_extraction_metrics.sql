-- ai_extraction_metrics.sql
-- Evaluates AI and rules-based extraction quality.

SELECT
    (SELECT COUNT(id) FROM Document) AS total_documents,
    (SELECT COUNT(id) FROM Document WHERE aiSummary IS NOT NULL) AS summarized,
    (SELECT COUNT(id) FROM Document WHERE aiSummary IS NULL) AS unsummarized,
    (SELECT COUNT(id) FROM InboxItem WHERE category IS NOT NULL) AS classified_inbox,
    (SELECT COUNT(id) FROM InboxItem WHERE category IS NULL) AS unclassified_inbox,
    (SELECT COUNT(id) FROM EmailDraft) AS total_drafts,
    (SELECT COUNT(id) FROM EmailDraft WHERE status IN ('approved', 'needs_changes', 'rejected')) AS reviewed_drafts;

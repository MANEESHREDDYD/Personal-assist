-- provider_draft_metrics.sql
-- Phase 3H: measures provider-side draft creation (Gmail/Outlook) after approval.
-- Provider drafts are recorded in EmailDraft.metadata (pushedToProvider=true).
-- This connector creates drafts only and never sends email.

SELECT
    (SELECT COUNT(id) FROM EmailDraft WHERE status = 'approved') AS approved_drafts,
    (SELECT COUNT(id) FROM EmailDraft
        WHERE metadata LIKE '%"pushedToProvider":true%') AS provider_drafts_created,
    (SELECT COUNT(id) FROM EmailDraft
        WHERE metadata LIKE '%"providerDrafts"%' AND metadata LIKE '%"gmail"%') AS gmail_provider_drafts,
    (SELECT COUNT(id) FROM EmailDraft
        WHERE metadata LIKE '%"providerDrafts"%' AND metadata LIKE '%"outlook"%') AS outlook_provider_drafts,
    (SELECT COUNT(id) FROM ConnectorAccount
        WHERE provider IN ('gmail_draft', 'outlook_draft')) AS draft_connectors_total,
    (SELECT COUNT(id) FROM ConnectorAccount
        WHERE provider IN ('gmail_draft', 'outlook_draft') AND status = 'connected') AS draft_connectors_connected,
    (SELECT COUNT(id) FROM AuditLog
        WHERE action = 'provider_draft_creation_failed') AS provider_draft_failures,
    (SELECT COUNT(id) FROM AuditLog
        WHERE action IN ('gmail_provider_draft_created', 'outlook_provider_draft_created')) AS provider_draft_create_events;

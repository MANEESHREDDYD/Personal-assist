import json
from .db import query_all, query_one

def build_inbox_mart():
    """Builds an analytics mart for inbox ingestion data."""
    total = query_one("SELECT COUNT(id) as c FROM InboxItem")['c'] or 0
    by_category = query_all("SELECT category, COUNT(id) as c FROM InboxItem GROUP BY category")
    return {
        'total_items': total,
        'by_category': {r['category'] or 'uncategorized': r['c'] for r in by_category}
    }

def build_document_mart():
    """Builds an analytics mart for document processing."""
    total = query_one("SELECT COUNT(id) as c FROM Document")['c'] or 0
    by_status = query_all("SELECT status, COUNT(id) as c FROM Document GROUP BY status")
    by_mime = query_all("SELECT mimeType, COUNT(id) as c FROM Document GROUP BY mimeType")
    return {
        'total_documents': total,
        'by_status': {r['status']: r['c'] for r in by_status},
        'by_mime_type': {r['mimeType']: r['c'] for r in by_mime}
    }

def build_draft_mart():
    """Builds an analytics mart for draft workflow."""
    total = query_one("SELECT COUNT(id) as c FROM EmailDraft")['c'] or 0
    by_status = query_all("SELECT status, COUNT(id) as c FROM EmailDraft GROUP BY status")
    return {
        'total_drafts': total,
        'by_status': {r['status']: r['c'] for r in by_status}
    }

def build_integration_mart():
    """Builds an analytics mart for integration health."""
    connectors = query_all("SELECT provider, status FROM ConnectorAccount")
    by_provider = {}
    for c in connectors:
        by_provider[c['provider']] = c['status']
    return {
        'total_accounts': len(connectors),
        'by_provider': by_provider
    }

def build_automation_mart():
    """Builds an analytics mart for automation execution."""
    total_rules = query_one("SELECT COUNT(id) as c FROM AutomationRule")['c'] or 0
    total_runs = query_one("SELECT COUNT(id) as c FROM AutomationRun")['c'] or 0
    by_status = query_all("SELECT status, COUNT(id) as c FROM AutomationRun GROUP BY status")
    return {
        'total_rules': total_rules,
        'total_runs': total_runs,
        'runs_by_status': {r['status']: r['c'] for r in by_status}
    }

def build_risk_mart():
    """Builds an analytics mart for risk analysis across drafts."""
    drafts = query_all("SELECT metadata FROM EmailDraft WHERE metadata IS NOT NULL")
    risk_dist = {'low': 0, 'medium': 0, 'high': 0, 'unknown': 0}
    for d in drafts:
        try:
            meta = json.loads(d['metadata'])
            level = meta.get('riskLevel', 'unknown').lower()
            risk_dist[level] = risk_dist.get(level, 0) + 1
        except Exception:
            risk_dist['unknown'] += 1
    return risk_dist

def build_all_marts():
    """Builds all analytics marts and returns a consolidated structure."""
    return {
        'inbox_mart': build_inbox_mart(),
        'document_mart': build_document_mart(),
        'draft_mart': build_draft_mart(),
        'integration_mart': build_integration_mart(),
        'automation_mart': build_automation_mart(),
        'risk_mart': build_risk_mart()
    }

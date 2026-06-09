import json
from .db import query_all

def run_quality_checks():
    """Runs data quality rules and returns issue counts."""
    issues = {}
    
    # 1. Missing external ID on imported records
    # For Calendar events imported from providers, externalId shouldn't be null
    missing_external = query_all("SELECT COUNT(id) as c FROM CalendarEvent WHERE source != 'imported_ics' AND externalId IS NULL")
    issues['missing_calendar_external_ids'] = missing_external[0]['c'] if missing_external else 0

    # 2. Documents missing path
    missing_path = query_all("SELECT COUNT(id) as c FROM Document WHERE path IS NULL OR path = ''")
    issues['documents_missing_local_path'] = missing_path[0]['c'] if missing_path else 0
    
    # 3. Drafts with invalid JSON metadata
    drafts = query_all("SELECT id, metadata FROM EmailDraft WHERE metadata IS NOT NULL")
    invalid_json_count = 0
    for d in drafts:
        try:
            json.loads(d['metadata'])
        except Exception:
            invalid_json_count += 1
            
    issues['drafts_with_invalid_metadata'] = invalid_json_count
    
    return issues

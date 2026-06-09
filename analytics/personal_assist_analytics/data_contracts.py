import json
from .db import query_all

# Data contracts define expected non-null fields for major entities
CONTRACTS = {
    'InboxItem': {
        'table': 'InboxItem',
        'required_fields': ['id', 'subject', 'sender', 'createdAt'],
        'optional_fields': ['category', 'metadata', 'externalId'],
        'description': 'Email messages ingested from Gmail/Outlook providers'
    },
    'CalendarEvent': {
        'table': 'CalendarEvent',
        'required_fields': ['id', 'title'],
        'optional_fields': ['source', 'externalId', 'startDate', 'endDate'],
        'description': 'Calendar events from Google/Outlook/ICS import'
    },
    'Document': {
        'table': 'Document',
        'required_fields': ['id', 'filename', 'originalName', 'mimeType', 'path'],
        'optional_fields': ['aiSummary', 'notes', 'status'],
        'description': 'Documents uploaded or extracted from email attachments'
    },
    'EmailDraft': {
        'table': 'EmailDraft',
        'required_fields': ['id', 'subject', 'body', 'status'],
        'optional_fields': ['metadata', 'relatedDocId'],
        'description': 'Local email drafts generated from document intelligence'
    },
    'ApprovalRequest': {
        'table': 'ApprovalRequest',
        'required_fields': ['id', 'entityType', 'entityId', 'status'],
        'optional_fields': ['reason', 'reviewerNotes'],
        'description': 'Human-in-the-loop approval gate records'
    },
    'ConnectorAccount': {
        'table': 'ConnectorAccount',
        'required_fields': ['id', 'provider', 'status'],
        'optional_fields': ['lastSyncAt', 'lastError'],
        'description': 'OAuth connector accounts for external provider integrations'
    },
    'AuditLog': {
        'table': 'AuditLog',
        'required_fields': ['id', 'action', 'entityType', 'entityId'],
        'optional_fields': ['details', 'createdAt'],
        'description': 'Immutable audit trail of all system actions'
    }
}

def validate_contracts():
    """Validates data contracts across all major entities.
    
    Checks for NULL values in required fields and returns violation counts.
    This emulates production data contract monitoring used in data engineering.
    """
    violations = {}
    summary = {'total_entities_checked': 0, 'total_violations': 0, 'entities_with_violations': 0}
    
    for entity_name, contract in CONTRACTS.items():
        table = contract['table']
        entity_violations = []
        
        for field in contract['required_fields']:
            try:
                rows = query_all(f"SELECT COUNT(id) as c FROM {table} WHERE {field} IS NULL OR {field} = ''")
                null_count = rows[0]['c'] if rows else 0
                if null_count > 0:
                    entity_violations.append({
                        'field': field,
                        'violation': 'required_field_null',
                        'count': null_count
                    })
            except Exception:
                pass
        
        total_rows_result = query_all(f"SELECT COUNT(id) as c FROM {table}")
        total_rows = total_rows_result[0]['c'] if total_rows_result else 0
        
        violations[entity_name] = {
            'total_rows': total_rows,
            'violations': entity_violations,
            'violation_count': sum(v['count'] for v in entity_violations),
            'status': 'PASS' if not entity_violations else 'FAIL'
        }
        
        summary['total_entities_checked'] += 1
        summary['total_violations'] += violations[entity_name]['violation_count']
        if entity_violations:
            summary['entities_with_violations'] += 1
    
    return {'contracts': violations, 'summary': summary}

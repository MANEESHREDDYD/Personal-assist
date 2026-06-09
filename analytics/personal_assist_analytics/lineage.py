from .db import query_one

def build_lineage_graph():
    """Builds a local data lineage graph showing entity-to-entity relationships.
    
    Models the full data flow from external providers through ingestion,
    processing, intelligence, approval gates, and export. This is the kind
    of lineage tracking used in production data engineering platforms.
    """
    edges = []
    node_counts = {}
    
    # Provider → InboxItem
    inbox_count = query_one("SELECT COUNT(id) as c FROM InboxItem")['c'] or 0
    node_counts['InboxItem'] = inbox_count
    if inbox_count > 0:
        edges.append({'source': 'Gmail/Outlook', 'target': 'InboxItem', 'relationship': 'ingests', 'count': inbox_count})
    
    # Provider → CalendarEvent
    event_count = query_one("SELECT COUNT(id) as c FROM CalendarEvent")['c'] or 0
    node_counts['CalendarEvent'] = event_count
    if event_count > 0:
        edges.append({'source': 'Google/Outlook Calendar', 'target': 'CalendarEvent', 'relationship': 'syncs', 'count': event_count})
    
    # InboxItem → Document (via attachment download)
    doc_count = query_one("SELECT COUNT(id) as c FROM Document")['c'] or 0
    node_counts['Document'] = doc_count
    if doc_count > 0:
        edges.append({'source': 'InboxItem', 'target': 'Document', 'relationship': 'extracts_attachment', 'count': doc_count})
    
    # Document → EmailDraft (via intelligence)
    draft_count = query_one("SELECT COUNT(id) as c FROM EmailDraft")['c'] or 0
    node_counts['EmailDraft'] = draft_count
    if draft_count > 0:
        edges.append({'source': 'Document', 'target': 'EmailDraft', 'relationship': 'generates_draft', 'count': draft_count})
    
    # EmailDraft → ApprovalRequest
    approval_count = query_one("SELECT COUNT(id) as c FROM ApprovalRequest")['c'] or 0
    node_counts['ApprovalRequest'] = approval_count
    if approval_count > 0:
        edges.append({'source': 'EmailDraft', 'target': 'ApprovalRequest', 'relationship': 'requires_approval', 'count': approval_count})
    
    # CalendarEvent → WalletCard
    wallet_count = query_one("SELECT COUNT(id) as c FROM WalletCard")['c'] or 0
    node_counts['WalletCard'] = wallet_count
    if wallet_count > 0:
        edges.append({'source': 'CalendarEvent', 'target': 'WalletCard', 'relationship': 'creates_card', 'count': wallet_count})
    
    # CalendarEvent/WalletCard → Reminder
    reminder_count = query_one("SELECT COUNT(id) as c FROM Reminder")['c'] or 0
    node_counts['Reminder'] = reminder_count
    if reminder_count > 0:
        edges.append({'source': 'WalletCard', 'target': 'Reminder', 'relationship': 'triggers_reminder', 'count': reminder_count})
    
    # ConnectorAccount (root)
    connector_count = query_one("SELECT COUNT(id) as c FROM ConnectorAccount")['c'] or 0
    node_counts['ConnectorAccount'] = connector_count
    if connector_count > 0:
        edges.append({'source': 'ConnectorAccount', 'target': 'Gmail/Outlook', 'relationship': 'authenticates', 'count': connector_count})
    
    # AuditLog (sink)
    audit_count = query_one("SELECT COUNT(id) as c FROM AuditLog")['c'] or 0
    node_counts['AuditLog'] = audit_count
    
    return {
        'edges': edges,
        'node_counts': node_counts,
        'total_nodes': len(node_counts),
        'total_edges': len(edges),
        'audit_trail_entries': audit_count
    }

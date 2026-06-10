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
    i_res = query_one("SELECT COUNT(id) as c FROM InboxItem")
    inbox_count = i_res['c'] if i_res else 0
    node_counts['InboxItem'] = inbox_count
    if inbox_count > 0:
        edges.append({'source': 'Gmail/Outlook', 'target': 'InboxItem', 'relationship': 'ingests', 'count': inbox_count})
    
    # Provider → CalendarEvent
    e_res = query_one("SELECT COUNT(id) as c FROM CalendarEvent")
    event_count = e_res['c'] if e_res else 0
    node_counts['CalendarEvent'] = event_count
    if event_count > 0:
        edges.append({'source': 'Google/Outlook Calendar', 'target': 'CalendarEvent', 'relationship': 'syncs', 'count': event_count})
    
    # InboxItem → Document (via attachment download)
    d_res = query_one("SELECT COUNT(id) as c FROM Document")
    doc_count = d_res['c'] if d_res else 0
    node_counts['Document'] = doc_count
    if doc_count > 0:
        edges.append({'source': 'InboxItem', 'target': 'Document', 'relationship': 'extracts_attachment', 'count': doc_count})
    
    # Document → EmailDraft (via intelligence)
    dr_res = query_one("SELECT COUNT(id) as c FROM EmailDraft")
    draft_count = dr_res['c'] if dr_res else 0
    node_counts['EmailDraft'] = draft_count
    if draft_count > 0:
        edges.append({'source': 'Document', 'target': 'EmailDraft', 'relationship': 'generates_draft', 'count': draft_count})
    
    # EmailDraft → ApprovalRequest
    ar_res = query_one("SELECT COUNT(id) as c FROM ApprovalRequest")
    approval_count = ar_res['c'] if ar_res else 0
    node_counts['ApprovalRequest'] = approval_count
    if approval_count > 0:
        edges.append({'source': 'EmailDraft', 'target': 'ApprovalRequest', 'relationship': 'requires_approval', 'count': approval_count})
    
    # CalendarEvent → WalletCard
    wc_res = query_one("SELECT COUNT(id) as c FROM WalletCard")
    wallet_count = wc_res['c'] if wc_res else 0
    node_counts['WalletCard'] = wallet_count
    if wallet_count > 0:
        edges.append({'source': 'CalendarEvent', 'target': 'WalletCard', 'relationship': 'creates_card', 'count': wallet_count})
    
    # CalendarEvent/WalletCard → Reminder
    r_res = query_one("SELECT COUNT(id) as c FROM Reminder")
    reminder_count = r_res['c'] if r_res else 0
    node_counts['Reminder'] = reminder_count
    if reminder_count > 0:
        edges.append({'source': 'WalletCard', 'target': 'Reminder', 'relationship': 'triggers_reminder', 'count': reminder_count})
    
    # ConnectorAccount (root)
    c_res = query_one("SELECT COUNT(id) as c FROM ConnectorAccount")
    connector_count = c_res['c'] if c_res else 0
    node_counts['ConnectorAccount'] = connector_count
    if connector_count > 0:
        edges.append({'source': 'ConnectorAccount', 'target': 'Gmail/Outlook', 'relationship': 'authenticates', 'count': connector_count})
    
    # AuditLog (sink)
    a_res = query_one("SELECT COUNT(id) as c FROM AuditLog")
    audit_count = a_res['c'] if a_res else 0
    node_counts['AuditLog'] = audit_count
    
    return {
        'edges': edges,
        'node_counts': node_counts,
        'total_nodes': len(node_counts),
        'total_edges': len(edges),
        'audit_trail_entries': audit_count
    }

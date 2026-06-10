from .db import query_all

def build_analytics_marts():
    """Builds local JSON analytics data marts for frontend consumption.
    
    This replaces the need for a cloud data warehouse (like Snowflake/BigQuery)
    by computing pre-aggregated dimensional models directly from SQLite.
    """
    marts = {}
    
    # 1. Inbox Mart
    try:
        inbox_raw = query_all("SELECT category, isProcessed, COUNT(id) as c FROM InboxItem GROUP BY category, isProcessed")
        inbox_mart = {'processed': 0, 'unprocessed': 0, 'categories': {}}
        for r in inbox_raw:
            cat = r.get('category') or 'uncategorized'
            count = r['c']
            if r['isProcessed']:
                inbox_mart['processed'] += count
            else:
                inbox_mart['unprocessed'] += count
            inbox_mart['categories'][cat] = inbox_mart['categories'].get(cat, 0) + count
        marts['inbox_mart'] = inbox_mart
    except Exception:
        pass
    
    # 2. Automation Mart
    try:
        auto_raw = query_all("SELECT action, status, COUNT(id) as c FROM AutomationRun GROUP BY action, status")
        auto_mart = {'total': 0, 'success': 0, 'failed': 0, 'actions': {}}
        for r in auto_raw:
            count = r['c']
            status = r['status']
            action = r['action']
            
            marts.setdefault('automation_mart', {'total': 0, 'success': 0, 'failed': 0, 'actions': {}})
            
            marts['automation_mart']['total'] += count
            if status == 'success':
                marts['automation_mart']['success'] += count
            elif status == 'failed':
                marts['automation_mart']['failed'] += count
                
            marts['automation_mart']['actions'].setdefault(action, {'success': 0, 'failed': 0})
            if status in ('success', 'failed'):
                marts['automation_mart']['actions'][action][status] += count
    except Exception:
        pass
    
    # 3. Intelligence Mart (Documents & Drafts)
    try:
        doc_count = query_all("SELECT COUNT(id) as c FROM Document")[0]['c']
        draft_count = query_all("SELECT COUNT(id) as c FROM EmailDraft")[0]['c']
        marts['intelligence_mart'] = {
            'total_documents_extracted': doc_count,
            'total_drafts_generated': draft_count,
            'generation_ratio': round(draft_count / doc_count, 2) if doc_count > 0 else 0
        }
    except Exception:
        pass
        
    return marts

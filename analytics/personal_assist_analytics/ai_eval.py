import json
from .db import query_all, query_one

def evaluate_ai_outputs():
    """Evaluates the quality and coverage of local AI/rules-based outputs.
    
    Measures classification coverage, extraction completeness, draft generation
    patterns, risk flagging rates, and fallback usage across the system.
    """
    results = {}
    
    # Classification coverage
    inbox_res = query_one("SELECT COUNT(id) as c FROM InboxItem")
    total_inbox = inbox_res['c'] if inbox_res else 0
    
    class_res = query_one("SELECT COUNT(id) as c FROM InboxItem WHERE category IS NOT NULL AND category != ''")
    classified = class_res['c'] if class_res else 0
    
    results['classification'] = {
        'total_items': total_inbox,
        'classified': classified,
        'coverage_percent': round(classified / total_inbox * 100, 2) if total_inbox > 0 else 0
    }
    
    # Document extraction coverage
    doc_res = query_one("SELECT COUNT(id) as c FROM Document")
    total_docs = doc_res['c'] if doc_res else 0
    
    sum_res = query_one("SELECT COUNT(id) as c FROM Document WHERE aiSummary IS NOT NULL")
    with_summary = sum_res['c'] if sum_res else 0
    
    results['extraction'] = {
        'total_documents': total_docs,
        'summarized': with_summary,
        'coverage_percent': round(with_summary / total_docs * 100, 2) if total_docs > 0 else 0
    }
    
    # Draft generation metrics
    drafts = query_all("SELECT metadata FROM EmailDraft WHERE metadata IS NOT NULL")
    generated_from_ai = 0
    fallback_count = 0
    for d in drafts:
        try:
            meta = json.loads(d['metadata'])
            gen = meta.get('generatedFrom', '')
            if gen:
                generated_from_ai += 1
            if meta.get('usedFallback', False) or gen == 'rules':
                fallback_count += 1
        except Exception:
            pass
    
    dr_res = query_one("SELECT COUNT(id) as c FROM EmailDraft")
    total_drafts = dr_res['c'] if dr_res else 0
    
    results['draft_generation'] = {
        'total_drafts': total_drafts,
        'ai_generated': generated_from_ai,
        'fallback_used': fallback_count,
        'fallback_rate': round(fallback_count / total_drafts * 100, 2) if total_drafts > 0 else 0
    }
    
    # Risk flag rate
    risk_flagged = 0
    for d in drafts:
        try:
            meta = json.loads(d['metadata'])
            if meta.get('riskLevel', 'low') in ('medium', 'high'):
                risk_flagged += 1
        except Exception:
            pass
    
    results['risk_flagging'] = {
        'total_evaluated': len(drafts),
        'flagged': risk_flagged,
        'flag_rate': round(risk_flagged / len(drafts) * 100, 2) if drafts else 0
    }
    
    return results

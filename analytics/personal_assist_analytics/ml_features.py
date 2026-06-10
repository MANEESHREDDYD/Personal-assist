import json
from .db import query_all, query_one

def compute_urgency_score():
    """Computes system-wide urgency based on overdue reminders and pending follow-ups."""
    o_res = query_one("SELECT COUNT(id) as c FROM Reminder WHERE status = 'pending' AND dueDate < datetime('now')")
    overdue = o_res['c'] if o_res else 0
    
    pf_res = query_one("SELECT COUNT(id) as c FROM FollowUp WHERE status = 'pending'")
    pending_followups = pf_res['c'] if pf_res else 0
    
    pa_res = query_one("SELECT COUNT(id) as c FROM ApprovalRequest WHERE status = 'pending'")
    pending_approvals = pa_res['c'] if pa_res else 0
    
    raw = (overdue * 3.0) + (pending_followups * 2.0) + (pending_approvals * 1.5)
    if raw > 30: return {'score': 'Critical', 'raw': round(raw, 2)}
    if raw > 15: return {'score': 'High', 'raw': round(raw, 2)}
    if raw > 5: return {'score': 'Medium', 'raw': round(raw, 2)}
    return {'score': 'Low', 'raw': round(raw, 2)}

def compute_workload_score():
    """Computes user workload from active tasks, reminders, events, and follow-ups."""
    reminders = query_one("SELECT COUNT(id) as c FROM Reminder WHERE status = 'pending'")['c'] or 0
    followups = query_one("SELECT COUNT(id) as c FROM FollowUp WHERE status = 'pending'")['c'] or 0
    events = query_one("SELECT COUNT(id) as c FROM CalendarEvent WHERE startDate > datetime('now')")['c'] or 0
    
    raw = (reminders * 1.5) + (followups * 2.0) + (events * 0.5)
    if raw > 25: return {'score': 'Overloaded', 'raw': round(raw, 2)}
    if raw > 15: return {'score': 'High', 'raw': round(raw, 2)}
    if raw > 5: return {'score': 'Moderate', 'raw': round(raw, 2)}
    return {'score': 'Light', 'raw': round(raw, 2)}

def compute_document_risk_score():
    """Computes aggregate document risk from metadata keywords."""
    docs = query_all("SELECT status, aiSummary FROM Document")
    high_risk_keywords = ['urgent', 'confidential', 'legal', 'payment', 'deadline', 'penalty', 'termination']
    risk_count = 0
    for d in docs:
        text = (d.get('aiSummary') or '').lower() + ' ' + (d.get('status') or '').lower()
        if any(kw in text for kw in high_risk_keywords):
            risk_count += 1
    total = len(docs)
    return {
        'total_documents': total,
        'high_risk_flagged': risk_count,
        'risk_rate': round(risk_count / total * 100, 2) if total > 0 else 0
    }

def compute_integration_reliability_score():
    """Computes connector reliability from status and error counts."""
    connectors = query_all("SELECT status, lastError FROM ConnectorAccount")
    if not connectors:
        return {'score': 'N/A', 'healthy': 0, 'unhealthy': 0, 'total': 0}
    healthy = sum(1 for c in connectors if c['status'] == 'connected')
    unhealthy = len(connectors) - healthy
    pct = round(healthy / len(connectors) * 100, 2)
    if pct >= 90: label = 'Excellent'
    elif pct >= 70: label = 'Good'
    elif pct >= 50: label = 'Degraded'
    else: label = 'Critical'
    return {'score': label, 'healthy': healthy, 'unhealthy': unhealthy, 'total': len(connectors), 'percent': pct}

def compute_automation_failure_score():
    """Computes automation pipeline failure rate."""
    t_res = query_one("SELECT COUNT(id) as c FROM AutomationRun")
    total = t_res['c'] if t_res else 0
    
    f_res = query_one("SELECT COUNT(id) as c FROM AutomationRun WHERE status = 'failed'")
    failed = f_res['c'] if f_res else 0
    
    rate = round(failed / total * 100, 2) if total > 0 else 0
    return {'total_runs': total, 'failed': failed, 'failure_rate': rate}

def compute_approval_complexity_score():
    """Measures how complex the approval workflow is based on volume and denial rates."""
    t_res = query_one("SELECT COUNT(id) as c FROM ApprovalRequest")
    total = t_res['c'] if t_res else 0
    
    d_res = query_one("SELECT COUNT(id) as c FROM ApprovalRequest WHERE status = 'denied'")
    denied = d_res['c'] if d_res else 0
    
    denial_rate = round(denied / total * 100, 2) if total > 0 else 0
    if denial_rate > 20: complexity = 'High'
    elif denial_rate > 5: complexity = 'Medium'
    else: complexity = 'Low'
    return {'total_requests': total, 'denied': denied, 'denial_rate': denial_rate, 'complexity': complexity}

def extract_all_ml_features():
    """Extracts all ML-style feature scores for the analytics report."""
    return {
        'urgency': compute_urgency_score(),
        'workload': compute_workload_score(),
        'document_risk': compute_document_risk_score(),
        'integration_reliability': compute_integration_reliability_score(),
        'automation_failure': compute_automation_failure_score(),
        'approval_complexity': compute_approval_complexity_score()
    }

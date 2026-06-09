import json
from .db import query_all

def compute_user_workload_score():
    """Computes a heuristic score based on pending reminders and follow-ups."""
    reminders = query_all("SELECT COUNT(id) as c FROM Reminder WHERE status = 'pending'")
    followups = query_all("SELECT COUNT(id) as c FROM FollowUp WHERE status = 'pending'")
    
    r_count = reminders[0]['c'] if reminders else 0
    f_count = followups[0]['c'] if followups else 0
    
    score = (r_count * 1.5) + (f_count * 2.0)
    
    if score > 20: return "High"
    if score > 10: return "Medium"
    return "Low"

def compute_integration_reliability():
    """Computes a reliability score based on connector errors vs total connectors."""
    connectors = query_all("SELECT status FROM ConnectorAccount")
    if not connectors:
        return 100.0
    
    failed = sum(1 for c in connectors if c['status'] in ('error', 'revoked'))
    total = len(connectors)
    
    return round(((total - failed) / total) * 100, 2)

def extract_workflow_features():
    """Returns AI/ML style computed features."""
    return {
        "workload_score": compute_user_workload_score(),
        "integration_reliability_percent": compute_integration_reliability()
    }

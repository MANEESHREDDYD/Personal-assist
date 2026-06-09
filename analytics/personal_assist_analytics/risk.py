import json
from .db import query_all

def analyze_risk_distribution():
    """Analyzes drafts to determine risk distribution based on metadata."""
    drafts = query_all("SELECT metadata FROM EmailDraft WHERE metadata IS NOT NULL")
    
    distribution = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "unknown": 0
    }
    
    for row in drafts:
        try:
            meta = json.loads(row['metadata'])
            risk = meta.get("riskLevel", "unknown").lower()
            if risk in distribution:
                distribution[risk] += 1
            else:
                distribution["unknown"] += 1
        except Exception:
            distribution["unknown"] += 1
            
    return distribution

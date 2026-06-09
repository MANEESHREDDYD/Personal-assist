import json
from datetime import datetime
from .config import OUTPUT_JSON, OUTPUT_MD

def generate_recommendations(counts, quality, risk):
    """Generates rule-based recommendations."""
    recs = []
    if quality.get('documents_missing_local_path', 0) > 0:
        recs.append("Check documents with failed extraction (missing path).")
    if risk.get('high', 0) > 0:
        recs.append("Resolve high-risk drafts.")
    if counts.get('failed_runs', 0) > 0:
        recs.append("Review failed automation runs.")
    if len(recs) == 0:
        recs.append("System looks healthy. No urgent actions.")
    return recs

def export_metrics(counts, features, quality, risk):
    """Exports metrics to JSON."""
    report = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "counts": counts,
        "qualityChecks": quality,
        "riskDistribution": risk,
        "workflowMetrics": features,
        "recommendations": generate_recommendations(counts, quality, risk)
    }
    
    # Ensure directory exists
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
        
    return report

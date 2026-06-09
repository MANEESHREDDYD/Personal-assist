import json
from datetime import datetime
from .config import OUTPUT_JSON, OUTPUT_MD


def generate_recommendations(counts, quality, risk, contracts=None, agentic=None):
    """Generates rule-based analyst recommendations from the gathered metrics."""
    recs = []
    if quality.get('documents_missing_local_path', 0) > 0:
        recs.append("Check documents with failed extraction (missing path).")
    if risk.get('high', 0) > 0:
        recs.append("Resolve high-risk drafts before export.")
    if counts.get('failed_runs', 0) > 0:
        recs.append("Review failed automation runs.")
    if contracts and contracts.get('summary', {}).get('total_violations', 0) > 0:
        recs.append("Address data contract violations in upstream ingestion.")
    if agentic:
        gate = agentic.get('human_approval_gate', {})
        if gate.get('total_requests', 0) > 0 and gate.get('approval_rate', 100) < 50:
            recs.append("Low approval rate — review draft generation quality.")
    if len(recs) == 0:
        recs.append("System looks healthy. No urgent actions.")
    return recs


def build_skill_showcase_summary(agentic, ai_eval, ml, contracts, lineage, marts):
    """Summarizes the portfolio skills the live analytics layer demonstrates.

    Each entry maps a career-positioning skill area to the concrete, data-backed
    capabilities exercised by this pipeline run. This is the recruiter-facing
    rollup surfaced on the /showcase page.
    """
    return {
        "dataEngineering": {
            "demonstrated": True,
            "evidence": "SQL metric queries, lineage graph, data contract validation",
            "lineage_edges": lineage.get('total_edges', 0),
            "entities_modeled": lineage.get('total_nodes', 0)
        },
        "analyticsEngineering": {
            "demonstrated": True,
            "evidence": "Analytics marts built from local SQLite",
            "marts_built": len(marts)
        },
        "dataScience": {
            "demonstrated": True,
            "evidence": "Deterministic feature engineering and scoring",
            "features_computed": len(ml)
        },
        "mlAiEngineering": {
            "demonstrated": True,
            "evidence": "AI output evaluation with deterministic guardrails",
            "deterministic_checks_passed": ai_eval.get('deterministic_checks', {}).get('passed', 0)
        },
        "genAi": {
            "demonstrated": True,
            "evidence": "Document summarization + draft generation via provider abstraction",
            "configured_provider": ai_eval.get('ai_provider', {}).get('configured_provider', 'rules'),
            "uses_paid_api": ai_eval.get('ai_provider', {}).get('uses_paid_api', False)
        },
        "agenticAi": {
            "demonstrated": True,
            "evidence": "Document intelligence -> local draft -> approval -> provider-side draft creation, with human-in-the-loop gates and a no-send safety policy",
            "approval_rate": agentic.get('human_approval_gate', {}).get('approval_rate', 0),
            "no_send_compliance": agentic.get('safety_compliance', {}).get('compliance_rate', 100.0),
            "provider_drafts_created": agentic.get('provider_drafts', {}).get('provider_drafts_created', 0),
            "emails_sent": agentic.get('provider_drafts', {}).get('emails_sent', 0)
        },
        "forwardDeployedEngineering": {
            "demonstrated": True,
            "evidence": "Local-first, zero-cost, no cloud dependency, no telemetry"
        },
        "dataQuality": {
            "demonstrated": True,
            "evidence": "Contract enforcement across major entities",
            "total_violations": contracts.get('summary', {}).get('total_violations', 0)
        }
    }


def export_metrics(report):
    """Writes the assembled analytics report to the local (gitignored) JSON output.

    `report` is a fully composed dict; this function only serializes it so the
    composition logic lives in run.py and stays testable.
    """
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    return report

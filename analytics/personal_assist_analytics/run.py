import sys
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from personal_assist_analytics.metrics import gather_counts
from personal_assist_analytics.features import extract_workflow_features
from personal_assist_analytics.quality import run_quality_checks
from personal_assist_analytics.risk import analyze_risk_distribution
from personal_assist_analytics.agentic import analyze_agentic_workflows
from personal_assist_analytics.ai_eval import evaluate_ai_outputs
from personal_assist_analytics.ml_features import extract_all_ml_features
from personal_assist_analytics.data_contracts import validate_contracts
from personal_assist_analytics.lineage import build_lineage_graph
from personal_assist_analytics.marts import build_analytics_marts
from personal_assist_analytics.role_metrics import analyze_role_usage
from personal_assist_analytics.scheduling_metrics import analyze_scheduling
from personal_assist_analytics.booking_metrics import analyze_booking
from personal_assist_analytics.scheduling_secretary_metrics import analyze_scheduling_secretary
from personal_assist_analytics.planner_metrics import analyze_planner
from personal_assist_analytics.project_metrics import analyze_projects
from personal_assist_analytics.export import (
    export_metrics,
    generate_recommendations,
    build_skill_showcase_summary,
)


def main():
    parser = argparse.ArgumentParser(description="Run Personal Assist Local Analytics")
    parser.parse_args()

    print("Starting Data Engineering & Analytics Pipeline...")

    counts = gather_counts()
    print(f"[+] Gathered SQL metrics (Total Keys: {len(counts)})")

    quality = run_quality_checks()
    print(f"[+] Ran Data Quality Checks (Issues found: {sum(quality.values())})")

    risk = analyze_risk_distribution()
    print("[+] Analyzed Risk Distribution")

    features = extract_workflow_features()
    print("[+] Extracted legacy workflow features")

    agentic = analyze_agentic_workflows()
    print("[+] Analyzed agentic workflow pipelines")

    ai_eval = evaluate_ai_outputs()
    print(f"[+] Evaluated AI outputs (deterministic checks: "
          f"{ai_eval.get('deterministic_checks', {}).get('passed', 0)} passed)")

    ml = extract_all_ml_features()
    print(f"[+] Computed {len(ml)} ML-style feature scores")

    contracts = validate_contracts()
    print(f"[+] Validated data contracts "
          f"({contracts['summary']['total_violations']} violations)")

    lineage = build_lineage_graph()
    print(f"[+] Built lineage graph ({lineage['total_edges']} edges)")

    marts = build_analytics_marts()
    print(f"[+] Built {len(marts)} analytics marts")

    role_usage = analyze_role_usage()
    print(f"[+] Analyzed role usage ({role_usage['supported_roles']} roles supported, "
          f"{role_usage['activated_role_profiles']} activated)")

    scheduling = analyze_scheduling()
    print(f"[+] Analyzed scheduling ({scheduling['calendar_write_requests']} write requests, "
          f"{scheduling['external_provider_events_written']} external events written)")

    booking = analyze_booking()
    print(f"[+] Analyzed booking ({booking['booking_requests_count']} requests, "
          f"{booking['provider_events_written_from_booking']} provider events from booking)")

    secretary = analyze_scheduling_secretary()
    print(f"[+] Analyzed scheduling secretary ({secretary['conversations_count']} conversations, "
          f"{secretary['emails_sent_by_secretary']} emails sent)")

    planner = analyze_planner()
    print(f"[+] Analyzed planner ({planner['tasks_count']} tasks, "
          f"{planner['provider_events_written_by_planner']} provider events by planner)")

    projects = analyze_projects()
    print(f"[+] Analyzed projects ({projects['projects_count']} projects, "
          f"{projects['provider_events_written_by_projects']} provider events by projects)")

    showcase = build_skill_showcase_summary(agentic, ai_eval, ml, contracts, lineage, marts)

    report = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "counts": counts,
        "qualityChecks": quality,
        "riskDistribution": risk,
        "workflowMetrics": features,
        "agenticWorkflowMetrics": agentic,
        "aiEvaluationMetrics": ai_eval,
        "mlFeatureSummary": ml,
        "dataContracts": contracts,
        "lineageGraphSummary": lineage,
        "analyticsMarts": marts,
        "roleUsageMetrics": role_usage,
        "schedulingMetrics": scheduling,
        "bookingMetrics": booking,
        "schedulingSecretaryMetrics": secretary,
        "plannerMetrics": planner,
        "projectMetrics": projects,
        "skillShowcaseSummary": showcase,
        "recommendations": generate_recommendations(counts, quality, risk, contracts, agentic),
    }

    export_metrics(report)
    print("[*] Pipeline complete. Output saved to data/analytics/personal_assist_metrics.json")


if __name__ == "__main__":
    main()

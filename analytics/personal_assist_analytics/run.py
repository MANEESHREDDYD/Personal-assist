import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from personal_assist_analytics.metrics import gather_counts
from personal_assist_analytics.features import extract_workflow_features
from personal_assist_analytics.quality import run_quality_checks
from personal_assist_analytics.risk import analyze_risk_distribution
from personal_assist_analytics.export import export_metrics

def main():
    parser = argparse.ArgumentParser(description="Run Personal Assist Local Analytics")
    parser.parse_args()

    print("Starting Data Engineering & Analytics Pipeline...")
    
    counts = gather_counts()
    print(f"[+] Gathered SQL metrics (Total Keys: {len(counts)})")
    
    quality = run_quality_checks()
    print(f"[+] Ran Data Quality Checks (Issues found: {sum(quality.values())})")
    
    risk = analyze_risk_distribution()
    print(f"[+] Analyzed Risk Distribution")
    
    features = extract_workflow_features()
    print(f"[+] Extracted ML-style features")
    
    export_metrics(counts, features, quality, risk)
    print(f"[*] Pipeline complete. Output saved to data/analytics/personal_assist_metrics.json")

if __name__ == "__main__":
    main()

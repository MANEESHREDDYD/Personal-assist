import json
from .config import OUTPUT_JSON, OUTPUT_MD

def generate_markdown():
    if not OUTPUT_JSON.exists():
        print("Run personal_assist_analytics/run.py first.")
        return
        
    with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    md = f"# Personal Assist Analytics Report\n"
    md += f"Generated At: {data.get('generatedAt')}\n\n"
    
    md += "## Key Metrics\n"
    for k, v in data.get("counts", {}).items():
        md += f"- **{k}**: {v}\n"
        
    OUTPUT_MD.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write(md)
        
    print(f"[*] Markdown report generated at {OUTPUT_MD}")

if __name__ == "__main__":
    generate_markdown()

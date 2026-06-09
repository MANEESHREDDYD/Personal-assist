import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "prisma" / "dev.db"

# Fallback to root dev.db if needed
if not DB_PATH.exists():
    DB_PATH = BASE_DIR / "dev.db"

ANALYTICS_DIR = BASE_DIR / "data" / "analytics"
OUTPUT_JSON = ANALYTICS_DIR / "personal_assist_metrics.json"
OUTPUT_MD = ANALYTICS_DIR / "personal_assist_report.md"

SQL_DIR = BASE_DIR / "analytics" / "sql"

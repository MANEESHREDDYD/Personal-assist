import os
from .config import SQL_DIR
from .db import query_one

def gather_counts():
    """Execute SQL metric queries and return a consolidated dictionary of counts."""
    counts = {}

    sql_files = {
        "inbox": "inbox_metrics.sql",
        "calendar": "calendar_metrics.sql",
        "document": "document_metrics.sql",
        "draft": "draft_metrics.sql",
        "approval": "approval_metrics.sql",
        "automation": "automation_metrics.sql",
        "audit": "audit_metrics.sql",
        "integration": "integration_metrics.sql"
    }

    for category, filename in sql_files.items():
        path = str(SQL_DIR / filename)
        if os.path.exists(path):
            result = query_one(path)
            # Ensure safe numerical returns
            for k, v in result.items():
                counts[k] = v if v is not None else 0

    return counts

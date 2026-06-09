# Personal Assist Analytics

This local analytics layer is built to demonstrate **Data Engineering**, **Data Science**, **AI Feature Extraction**, and **Analytics** capabilities on top of the Personal Assist SQLite database.

## Purpose
It reads the local `dev.db`, executes SQL aggregations, performs heuristic AI/Risk feature extraction, and runs data quality checks. It outputs a local JSON report that powers the **Engineering Showcase** page in the main application.

## Privacy Note
**No analytics leave your machine.** This entire pipeline runs locally on your device. The outputs are written to the `.gitignore`'d `data/analytics/` folder and are never uploaded or sent to any telemetry service.

## Installation
This layer uses only Python standard libraries to ensure zero-cost, reliable local execution.
You must have Python 3.8+ installed.

No `pip install` is strictly required unless you extend it with Pandas or scikit-learn in the future.

## How to Run

From the project root:
```bash
npm run analytics:run
```
*(Or run `python analytics/personal_assist_analytics/run.py`)*

## Outputs Generated
- `data/analytics/personal_assist_metrics.json`: The core data object for the UI.
- `data/analytics/personal_assist_report.md`: Optional markdown reading format.

## Troubleshooting
If it fails to find the database, ensure you have run `npm run db:reset` or `npx prisma db push` first, so that `dev.db` exists in your root or `prisma/` folder.

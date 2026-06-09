import json
from .db import query_all, query_one

def evaluate_ai_outputs():
    """Evaluates the quality and coverage of local AI/rules-based outputs.
    
    Measures classification coverage, extraction completeness, draft generation
    patterns, risk flagging rates, and fallback usage across the system.
    """
    results = {}
    
    # Classification coverage
    total_inbox = query_one("SELECT COUNT(id) as c FROM InboxItem")['c'] or 0
    classified = query_one("SELECT COUNT(id) as c FROM InboxItem WHERE category IS NOT NULL AND category != ''")['c'] or 0
    results['classification'] = {
        'total_items': total_inbox,
        'classified': classified,
        'coverage_percent': round(classified / total_inbox * 100, 2) if total_inbox > 0 else 0
    }
    
    # Document extraction coverage
    total_docs = query_one("SELECT COUNT(id) as c FROM Document")['c'] or 0
    with_summary = query_one("SELECT COUNT(id) as c FROM Document WHERE aiSummary IS NOT NULL")['c'] or 0
    results['extraction'] = {
        'total_documents': total_docs,
        'summarized': with_summary,
        'coverage_percent': round(with_summary / total_docs * 100, 2) if total_docs > 0 else 0
    }
    
    # Draft generation metrics
    drafts = query_all("SELECT metadata FROM EmailDraft WHERE metadata IS NOT NULL")
    generated_from_ai = 0
    fallback_count = 0
    for d in drafts:
        try:
            meta = json.loads(d['metadata'])
            gen = meta.get('generatedFrom', '')
            if gen:
                generated_from_ai += 1
            if meta.get('usedFallback', False) or gen == 'rules':
                fallback_count += 1
        except Exception:
            pass
    
    total_drafts = query_one("SELECT COUNT(id) as c FROM EmailDraft")['c'] or 0
    results['draft_generation'] = {
        'total_drafts': total_drafts,
        'ai_generated': generated_from_ai,
        'fallback_used': fallback_count,
        'fallback_rate': round(fallback_count / total_drafts * 100, 2) if total_drafts > 0 else 0
    }
    
    # Risk flag rate
    risk_flagged = 0
    for d in drafts:
        try:
            meta = json.loads(d['metadata'])
            if meta.get('riskLevel', 'low') in ('medium', 'high'):
                risk_flagged += 1
        except Exception:
            pass
    
    results['risk_flagging'] = {
        'total_evaluated': len(drafts),
        'flagged': risk_flagged,
        'flag_rate': round(risk_flagged / len(drafts) * 100, 2) if drafts else 0
    }

    # AI provider configuration (Ollama availability as represented in settings)
    results['ai_provider'] = _evaluate_provider_config()

    # Deterministic evaluation checks — sanity invariants that must always hold
    results['deterministic_checks'] = _run_deterministic_checks(results)

    return results


def _evaluate_provider_config():
    """Reports the configured AI provider and whether a local Ollama LLM is set up.

    Reads the same UserPreference keys (AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL)
    used by the application's provider abstraction. Falls back to 'rules' — the
    zero-cost deterministic backend — when nothing is configured. No network call
    is made and no paid API is ever contacted.
    """
    prefs = {}
    try:
        rows = query_all(
            "SELECT key, value FROM UserPreference "
            "WHERE key IN ('AI_PROVIDER', 'OLLAMA_BASE_URL', 'OLLAMA_MODEL')"
        )
        prefs = {r['key']: r['value'] for r in rows}
    except Exception:
        prefs = {}

    configured_provider = prefs.get('AI_PROVIDER', 'rules')
    ollama_configured = bool(prefs.get('OLLAMA_BASE_URL') or prefs.get('OLLAMA_MODEL'))

    return {
        'configured_provider': configured_provider,
        'ollama_configured': ollama_configured,
        'ollama_model': prefs.get('OLLAMA_MODEL'),
        'uses_paid_api': False,
        'rules_fallback_available': True
    }


def _run_deterministic_checks(results):
    """Runs deterministic invariants over the evaluation results.

    These are rule-based assertions (no randomness, no LLM) that validate the
    internal consistency of AI evaluation output — the kind of guardrail used to
    keep an AI pipeline trustworthy.
    """
    checks = []

    def record(name, passed, detail):
        checks.append({'check': name, 'passed': bool(passed), 'detail': detail})

    cls = results.get('classification', {})
    record(
        'classified_not_exceeding_total',
        cls.get('classified', 0) <= cls.get('total_items', 0),
        'Classified item count never exceeds total inbox items'
    )
    record(
        'classification_coverage_bounded',
        0 <= cls.get('coverage_percent', 0) <= 100,
        'Classification coverage stays within 0-100%'
    )

    ext = results.get('extraction', {})
    record(
        'summarized_not_exceeding_total',
        ext.get('summarized', 0) <= ext.get('total_documents', 0),
        'Summarized document count never exceeds total documents'
    )

    dg = results.get('draft_generation', {})
    record(
        'fallback_not_exceeding_total',
        dg.get('fallback_used', 0) <= dg.get('total_drafts', 0),
        'Fallback draft count never exceeds total drafts'
    )

    rf = results.get('risk_flagging', {})
    record(
        'flagged_not_exceeding_evaluated',
        rf.get('flagged', 0) <= rf.get('total_evaluated', 0),
        'Risk-flagged drafts never exceed evaluated drafts'
    )

    passed = sum(1 for c in checks if c['passed'])
    return {
        'checks': checks,
        'total': len(checks),
        'passed': passed,
        'all_passed': passed == len(checks)
    }

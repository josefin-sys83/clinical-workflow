"""Task 46 live quality checks; skipped unless RUN_RESULT_AI_EVAL=1.

From the repository root (PowerShell):
  $env:RUN_RESULT_AI_EVAL = '1'
  python -m pytest services/ai/tests/test_result_suggestions_live.py -q -s
  Remove-Item Env:RUN_RESULT_AI_EVAL

Uses services/ai/.env without overriding existing environment variables. Makes at
most 36 paid, sequential calls, at least 12 seconds apart, with no retries. Set
RESULT_AI_EVAL_REPETITIONS=1 or 2 for a smaller run (default 3). Stops
on an API/schema error. Does not use the backend, database or saved results.
Outputs every response plus a temporary JSON report for MANUAL source comparison.
Passing these coarse checks is not proof of factual completeness or accuracy.
"""

import asyncio
from dataclasses import replace
import hashlib
import json
import os
from pathlib import Path
import re

import pytest

from clinical_ai.config import Settings
from clinical_ai.llm import LLMGateway, create_llm_provider
from clinical_ai.modules.study_results.models import SuggestResultRequest
from clinical_ai.modules.study_results.prompts import SYSTEM
from clinical_ai.modules.study_results.service import ResultsService


FIXTURES = json.loads(
    (Path(__file__).parent / "fixtures" / "result_suggestion_cases.json").read_text(encoding="utf-8")
)
QUALIFICATION = r"\b(synthetic|simulated|fictional)\b|software[- ]test"


def review_flags(case, result):
    """Fixture-specific screening, not production validation or an AI grader."""
    flags = []
    description = result.description or ""
    if case["abstain"]:
        if any((result.title, result.description, result.reportSectionKey, result.alternativeSectionKeys)):
            flags.append("Expected abstention, not generated metadata")
        if not result.limitation:
            flags.append("Missing abstention reason")
        return flags

    if not result.title or not description:
        flags.append("Missing supported title or description")
    if result.reportSectionKey != case["expectedSection"]:
        flags.append("Unexpected report section")
    if set(result.alternativeSectionKeys) != set(case["expectedAlternatives"]):
        flags.append("Unexpected or redundant section alternatives")
    marked = bool(re.search(QUALIFICATION, description, re.I))
    if marked != case["synthetic"]:
        flags.append("Missing or unsupported synthetic qualification in description")
    for topic in case["requiredTopics"]:
        if not re.search(topic, description, re.I):
            flags.append(f"Missing topic/value: {topic}")

    # Only the mixed fixture supplies the safety denominator of 100. A raw count
    # check would miss reusing that valid number as a count of affected people.
    if case["expectedAlternatives"]:
        for sentence in re.split(r"(?<=[.!?])\s+", description):
            if re.search(r"\b(100|one hundred)\b", sentence, re.I):
                if not re.search(r"safety population|denominator|enrolled|total.*participants", sentence, re.I):
                    flags.append("Population of 100 has no clear denominator label")
                if re.search(r"(?:events|records)\s+(?:in|for|among)\s+(?:all\s+)?100", sentence, re.I):
                    flags.append("Population may be presented as people with events")

    text = f"{result.title or ''} {description}"
    if re.search(r"\bp\s*(?:value\s*)?[=<>]\s*\d|\bclinically superior\b|\brecommend\w* treatment\b", text, re.I):
        flags.append("Unsupported statistical or clinical claim")
    # These fixtures supply categories, not acceptance criteria or pass judgments.
    if re.search(r"\b(acceptable|successful|passed)\b", description, re.I):
        flags.append("Unsupported evaluative label; use the source's neutral category")
    if case["name"] == "missing-statistics":
        if re.search(r"%|percent|\b(20|85|15|twenty|eighty-five|fifteen)\b", text, re.I):
            flags.append("Recalculated missing statistics")
    return flags


@pytest.mark.skipif(os.getenv("RUN_RESULT_AI_EVAL") != "1", reason="Paid AI evaluation is opt-in")
def test_live_result_quality(tmp_path):
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
    settings = replace(Settings.from_env(), ai_max_attempts=1, ai_call_timeout_ms=45_000)
    repetitions = int(os.getenv("RESULT_AI_EVAL_REPETITIONS", "3"))
    assert 1 <= repetitions <= 3, "Use 1, 2 or 3 repetitions (at most 36 calls)."
    report_path = tmp_path / "result-suggestions-live.json"
    report = {
        "promptSha256": hashlib.sha256(SYSTEM.encode()).hexdigest(),
        "manualReviewRequired": True,
        "plannedCalls": len(FIXTURES["cases"]) * repetitions,
        "responses": [],
        "error": None,
    }
    print(f"\nReview report: {report_path}", flush=True)
    print(f"Prompt SHA256: {report['promptSha256']}", flush=True)

    async def run():
        provider = create_llm_provider(settings)
        try:
            missing = provider.missing_config()
            if missing:
                raise ValueError("Missing AI configuration: " + ", ".join(missing))
            service = ResultsService(LLMGateway(provider, settings))
            loop = asyncio.get_running_loop()
            last_start = None
            for repetition in range(1, repetitions + 1):
                for case in FIXTURES["cases"]:
                    if last_start is not None:
                        await asyncio.sleep(max(0, 12 - (loop.time() - last_start)))
                    request = SuggestResultRequest(**case["input"], sections=FIXTURES["sections"])
                    before = request.model_dump()
                    last_start = loop.time()
                    print(f"Starting {case['name']} / {repetition}", flush=True)
                    result = await service.suggest(request)
                    flags = review_flags(case, result)
                    if request.model_dump() != before:
                        flags.append("Source was mutated")
                    record = {
                        "case": case["name"], "repetition": repetition,
                        "result": result.model_dump(), "flags": flags,
                        "manualReview": case["manualReview"],
                    }
                    report["responses"].append(record)
                    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
                    print(json.dumps(record, ensure_ascii=False), flush=True)
        finally:
            await provider.aclose()

    try:
        asyncio.run(run())
    except Exception as exc:
        # Record the type, not provider error bodies that might contain secrets.
        report["error"] = type(exc).__name__
    finally:
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    flagged = [f"{r['case']} / {r['repetition']}: {r['flags']}" for r in report["responses"] if r["flags"]]
    assert report["error"] is None, (
        f"Stopped after {len(report['responses'])}/{report['plannedCalls']} responses: {report['error']}. "
        f"Remaining cases were NOT tested. Report: {report_path}"
    )
    assert len(report["responses"]) == report["plannedCalls"], "Evaluation did not complete all cases"
    assert not flagged, "Quality flags (review against source):\n" + "\n".join(flagged)

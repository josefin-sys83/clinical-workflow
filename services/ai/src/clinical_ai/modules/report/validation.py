from __future__ import annotations

import re
from typing import Any

from clinical_ai.utils import js_number_str


def validate_statistical_values(sectionContent: str, sectionTitle: str) -> dict[str, Any]:
    # sectionTitle is intentionally preserved in the signature for parity with ai.service.ts.
    issues: list[dict[str, str]] = []
    if not sectionContent or not isinstance(sectionContent, str):
        return {"issues": issues}

    text = re.sub(r"<[^>]*>", " ", sectionContent)
    text = re.sub(r"\s+", " ", text)

    for match in re.finditer(r"p\s*[=<>]\s*([\d.]+)", text, flags=re.IGNORECASE):
        try:
            val = float(match.group(1))
        except ValueError:
            continue
        if val < 0 or val > 1:
            issues.append(
                {
                    "severity": "blocker",
                    "description": f"Invalid p-value: {match.group(0)} — p-values must be between 0 and 1.",
                    "location": match.group(0),
                }
            )
        if val > 0.5 and "significant" in text.lower():
            issues.append(
                {
                    "severity": "warning",
                    "description": f"Possible inconsistency: p={js_number_str(val)} but section claims statistical significance (typically p<0.05).",
                    "location": match.group(0),
                }
            )

    for match in re.finditer(r"([\d.]+)\s*%", text):
        try:
            val = float(match.group(1))
        except ValueError:
            continue
        if val < 0 or val > 100:
            issues.append(
                {
                    "severity": "blocker",
                    "description": f"Invalid percentage: {match.group(0)} — percentages must be between 0 and 100.",
                    "location": match.group(0),
                }
            )

    for match in re.finditer(
        r"\(?\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)?(?:\s*(?:95%|90%|99%)?\s*(?:CI|confidence interval))?",
        text,
        flags=re.IGNORECASE,
    ):
        try:
            lower = float(match.group(1))
            upper = float(match.group(2))
        except ValueError:
            continue
        if lower > upper:
            issues.append(
                {
                    "severity": "blocker",
                    "description": f"Invalid confidence interval: lower bound ({js_number_str(lower)}) exceeds upper bound ({js_number_str(upper)}).",
                    "location": match.group(0),
                }
            )

    total_match = re.search(
        r"(?:total|n\s*=\s*|enrolled|randomized)\s*[:\s]?\s*(\d+)\s*(?:subjects|patients|participants)",
        text,
        flags=re.IGNORECASE,
    )
    if total_match:
        total = int(total_match.group(1))
        group_matches = list(
            re.finditer(r"(?:group|arm|treatment|control)[^.]*?n\s*=\s*(\d+)", text, flags=re.IGNORECASE)
        )
        if len(group_matches) >= 2:
            group_sum = sum(int(match.group(1)) for match in group_matches)
            if abs(group_sum - total) > 2 and group_sum > 0:
                issues.append(
                    {
                        "severity": "warning",
                        "description": f"Sample size arithmetic inconsistency: group sizes sum to {group_sum} but total stated as {total}.",
                        "location": total_match.group(0),
                    }
                )

    power_match = re.search(r"(?:power|1\s*-\s*β)\s*(?:of|=|:)?\s*([\d.]+)%?", text, flags=re.IGNORECASE)
    if power_match:
        raw_power = float(power_match.group(1))
        power = raw_power / (100 if raw_power > 1 else 1)
        if power < 0.7 or power > 0.99:
            issues.append(
                {
                    "severity": "warning",
                    "description": f"Unusual statistical power: {power_match.group(0)} — typical range is 80-90% per ISO 14155:2020.",
                    "location": power_match.group(0),
                }
            )

    return {"issues": issues}

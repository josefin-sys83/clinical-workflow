from __future__ import annotations

import re
from typing import Any

from clinical_ai.utils import get_value


def quote_appears_in_source(quote: Any, source_content: str) -> bool:
    if not isinstance(quote, str):
        return False

    def normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value.lower()).strip()

    normalized_quote = normalize(quote)
    if len(normalized_quote) < 8:
        return False
    return normalized_quote in normalize(source_content)


def verify_required_element_evidence(parsed: Any, source_content: str) -> Any:
    if not isinstance(parsed, dict) or not isinstance(parsed.get("requiredElements"), list):
        return parsed

    required_elements = []
    for element in parsed["requiredElements"]:
        status = get_value(element, "status")
        if status not in ("complete", "partial"):
            required_elements.append(element)
            continue
        if quote_appears_in_source(get_value(element, "evidence"), source_content):
            required_elements.append(element)
            continue

        updated = dict(element) if isinstance(element, dict) else {}
        updated.update(
            {
                "status": "missing",
                "evidence": (
                    f'Could not verify — the AI reported this element as "{status}" but the cited evidence '
                    "does not appear verbatim in the section content, so it has been flagged for manual "
                    "review instead of trusted automatically."
                ),
            }
        )
        required_elements.append(updated)

    parsed["requiredElements"] = required_elements
    return parsed

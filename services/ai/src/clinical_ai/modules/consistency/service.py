from __future__ import annotations

import json
import re
from typing import Any

from clinical_ai.llm import LLMGateway
from clinical_ai.utils import get_value
from .prompts import cross_consistency_prompt, statistical_consistency_prompt, synopsis_consistency_prompt


class ConsistencyService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def check_statistical_consistency(
        self,
        statistical_methods_content: str,
        results_content: str,
        target_markets: list[str],
    ) -> dict[str, Any]:
        if not statistical_methods_content or not results_content:
            return {"issues": []}
        result = await self.llm.complete(
            statistical_consistency_prompt(statistical_methods_content, results_content, target_markets)
        )
        return self._parse_issues(result)

    async def check_cross_consistency(
        self,
        protocol_sections: list[dict[str, str]],
        report_sections: list[dict[str, str]],
        target_markets: list[str],
        device_category: str,
    ) -> dict[str, Any]:
        # target_markets and device_category are intentionally preserved: the old method accepted them
        # even though the prompt only uses the extracted section content.
        critical_protocol = "\n\n---\n\n".join(
            f"{get_value(section, 'title')}:\n{str(get_value(section, 'content', ''))[:800]}"
            for section in protocol_sections
            if get_value(section, "title")
            in [
                "Study Rationale & Objectives",
                "Study Design",
                "Statistical Considerations",
                "Safety Monitoring & Reporting",
            ]
        )
        critical_report = "\n\n---\n\n".join(
            f"{get_value(section, 'title')}:\n{re.sub(r'<[^>]*>', '', str(get_value(section, 'content', '')))[:800]}"
            for section in report_sections
            if get_value(section, "title")
            in [
                "Objectives and Endpoints",
                "Clinical Investigation Design",
                "Statistical Methods",
                "Safety Analysis",
            ]
        )
        if not critical_protocol or not critical_report:
            return {"issues": []}
        result = await self.llm.complete(cross_consistency_prompt(critical_protocol, critical_report))
        return self._parse_issues(result)

    async def check_synopsis_consistency(
        self,
        synopsis_text: str,
        protocol_sections: list[dict[str, str]],
    ) -> dict[str, Any]:
        critical_sections = "\n\n---\n\n".join(
            f"{get_value(section, 'title')}:\n{str(get_value(section, 'content', ''))[:600]}"
            for section in protocol_sections
            if get_value(section, "title")
            in ["Study Rationale & Objectives", "Study Design", "Statistical Considerations"]
        )
        if not synopsis_text or not critical_sections:
            return {"issues": []}
        result = await self.llm.complete(synopsis_consistency_prompt(synopsis_text, critical_sections))
        return self._parse_issues(result)

    @staticmethod
    def _parse_issues(result: str) -> dict[str, Any]:
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            json_match = re.search(r"\{[\s\S]*\}", clean)
            if json_match:
                return json.loads(json_match.group(0))
            return {"issues": []}
        except Exception:
            return {"issues": []}

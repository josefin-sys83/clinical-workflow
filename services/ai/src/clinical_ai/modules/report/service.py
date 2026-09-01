from __future__ import annotations

import json
import logging
import re
from typing import Any

from clinical_ai.llm import LLMGateway
from .prompts import analyze_report_section_prompt, generate_report_section_prompt
from .rules import (
    get_report_section_analysis_requirements,
    get_report_section_instructions,
    get_report_section_relevant_protocol,
)
from .validation import validate_statistical_values

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def generate_section(
        self,
        section_title: Any,
        section_number: Any,
        protocol_sections: list[Any],
        synopsis: Any,
        scope: Any,
        project_data: Any,
        roles: list[Any],
        existing_report_sections: list[Any],
    ) -> str:
        # existing_report_sections is preserved because it is part of the old public signature.
        relevant_protocol_content = get_report_section_relevant_protocol(section_title, protocol_sections)
        raw = await self.llm.complete(
            generate_report_section_prompt(
                section_title,
                section_number,
                protocol_sections,
                synopsis,
                scope,
                project_data,
                roles,
                relevant_protocol_content,
            )
        )
        result = raw.strip()
        result = re.sub(r"^```html\s*\n?", "", result, flags=re.IGNORECASE)
        result = re.sub(r"^```\s*\n?", "", result)
        result = re.sub(r"\n?```\s*$", "", result)
        return result.strip()

    async def analyze_section(
        self,
        section_title: Any,
        section_content: Any,
        target_markets: Any,
        device_category: Any,
        intended_use: Any,
        appendices_list: list[str] | None = None,
        amendment_context: dict[str, Any] | None = None,
    ) -> Any:
        result = await self.llm.complete(
            analyze_report_section_prompt(
                section_title,
                section_content,
                target_markets,
                device_category,
                intended_use,
                appendices_list,
                amendment_context,
            )
        )
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            json_match = re.search(r"\{[\s\S]*\}", clean)
            if not json_match:
                return {"issues": [], "requiredElements": []}
            return json.loads(json_match.group(0))
        except Exception as exc:
            logger.error(
                "[analyzeReportSection] JSON parse failed: %r raw result: %s",
                exc,
                result[:200] if result else "",
            )
            return {"issues": [], "requiredElements": []}

    @staticmethod
    def validate_statistical_values(section_content: str, section_title: str):
        return validate_statistical_values(section_content, section_title)

    @staticmethod
    def get_section_instructions(section_title: str, section_number: int):
        return get_report_section_instructions(section_title, section_number)

    @staticmethod
    def get_section_relevant_protocol(section_title: str, protocol_sections: list[Any]):
        return get_report_section_relevant_protocol(section_title, protocol_sections)

    @staticmethod
    def get_section_analysis_requirements(section_title: str):
        return get_report_section_analysis_requirements(section_title)

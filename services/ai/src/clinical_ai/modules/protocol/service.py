from __future__ import annotations

import asyncio
import json
import logging
import random
import re
from datetime import datetime
from typing import Any, Awaitable, Callable

from clinical_ai.llm import LLMGateway
from clinical_ai.utils import get_value
from .prompts import analyze_section_prompt, generate_protocol_section_prompt, generate_required_elements_prompt
from .rules import PROTOCOL_SECTION_TITLES, get_core_regulatory_context, get_section_requirements
from .validation import quote_appears_in_source, verify_required_element_evidence

logger = logging.getLogger(__name__)


class ProtocolService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def generate_section(
        self,
        section_title: str,
        project_data: Any,
        synopsis: str,
        scope: Any,
        additional_fixes: str | None = None,
    ) -> str:
        device_category = get_value(scope, "deviceCategory", "") or get_value(project_data, "deviceCategory", "") or ""
        regulatory_refs = get_core_regulatory_context(
            get_value(project_data, "targetMarkets", []) or [],
            device_category,
        )
        raw = await self.llm.complete(
            generate_protocol_section_prompt(
                section_title,
                project_data,
                synopsis,
                scope,
                regulatory_refs,
                additional_fixes,
            )
        )
        content = re.sub(r"\*\*(.*?)\*\*", r"\1", raw)
        content = re.sub(r"\*(.*?)\*", r"\1", content)
        content = re.sub(r"#{1,6}\s", "", content).strip()
        if not content:
            raise RuntimeError(f'AI generation failed for protocol section "{section_title}": empty response after retries')
        return content

    async def _map_in_batches(
        self,
        items: list[Any],
        batch_size: int,
        fn: Callable[[Any], Awaitable[Any]],
        on_item_done: Callable[[Any], None] | None = None,
    ) -> list[Any]:
        results: list[Any] = []
        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]

            async def run_item(item: Any) -> Any:
                result = await fn(item)
                if on_item_done:
                    on_item_done(item)
                return result

            results.extend(await asyncio.gather(*(run_item(item) for item in batch)))
        return results

    async def generate(
        self,
        project_data: Any,
        roles: list[Any],
        synopsis: str,
        scope: Any,
        on_section_done: Callable[[str], None] | None = None,
    ) -> Any:
        # roles is intentionally preserved although the original generateProtocol does not use it.
        section_titles = PROTOCOL_SECTION_TITLES
        contents = await self._map_in_batches(
            section_titles,
            3,
            lambda title: self.generate_section(title, project_data, synopsis, scope),
            on_section_done,
        )
        sections = [
            {
                "id": str(i + 1),
                "title": title,
                "content": contents[i].strip(),
                "status": "draft",
            }
            for i, title in enumerate(section_titles)
        ]
        return {
            "protocolId": f"CIP-{datetime.now().year}-MED-{random.randint(1000, 9999)}",
            "sections": sections,
        }

    async def generate_required_elements(
        self,
        section_title: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
    ) -> list[Any]:
        result = await self.llm.complete(
            generate_required_elements_prompt(section_title, target_markets, device_category, intended_use)
        )
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            return json.loads(clean)
        except Exception:
            return []

    async def analyze_section(
        self,
        section_title: str,
        section_content: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
        required_elements: list[Any] | None = None,
        amendment_context: dict[str, Any] | None = None,
        cross_section_context: list[dict[str, str]] | None = None,
        accepted_requirements: str | None = None,
        synopsis_excerpt: str | None = None,
    ) -> Any:
        result = await self.llm.complete(
            analyze_section_prompt(
                section_title,
                section_content,
                target_markets,
                device_category,
                intended_use,
                required_elements,
                amendment_context,
                cross_section_context,
                accepted_requirements,
                synopsis_excerpt,
            )
        )
        if not result:
            logger.error("[analyzeSection] AI call returned no response after retries")
            return {"error": True, "message": "AI analysis is temporarily unavailable — no response after retries."}

        try:
            clean = re.sub(r"```json|```", "", result).strip()
            json_match = re.search(r"\{[\s\S]*\}", clean)
            if not json_match:
                logger.error("[analyzeSection] No JSON object found in AI response: %s", result[:200])
                return {"error": True, "message": "AI analysis failed to return a valid result."}
            parsed = json.loads(json_match.group(0))
            return verify_required_element_evidence(parsed, section_content)
        except Exception as exc:
            logger.error("[analyzeSection] JSON parse failed: %r raw: %s", exc, result[:200] if result else "")
            return {"error": True, "message": "AI analysis failed to return a valid result."}

    # Compatibility helpers used by parity tests and callers that relied on the old AiService surface.
    @staticmethod
    def quote_appears_in_source(quote: Any, source_content: str) -> bool:
        return quote_appears_in_source(quote, source_content)

    @staticmethod
    def verify_required_element_evidence(parsed: Any, source_content: str) -> Any:
        return verify_required_element_evidence(parsed, source_content)

    @staticmethod
    def get_core_regulatory_context(target_markets: list[str], device_category: str) -> str:
        return get_core_regulatory_context(target_markets, device_category)

    @staticmethod
    def get_section_requirements(section_title: str) -> dict[str, str]:
        return get_section_requirements(section_title)

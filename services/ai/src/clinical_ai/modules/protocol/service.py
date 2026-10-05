from __future__ import annotations

from typing import Any, Awaitable, Callable

from clinical_ai.llm import LLMGateway
from .analysis import ProtocolAnalysisService
from .generation import ProtocolGenerationService
from .rules import get_core_regulatory_context, get_section_requirements
from .validation import quote_appears_in_source, verify_required_element_evidence


class ProtocolService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm
        self.generation = ProtocolGenerationService(llm)
        self.analysis = ProtocolAnalysisService(llm)

    async def generate_section(
        self,
        section_title: str,
        project_data: Any,
        synopsis: str,
        scope: Any,
        additional_fixes: str | None = None,
    ) -> str:
        return await self.generation.generate_section(
            section_title,
            project_data,
            synopsis,
            scope,
            additional_fixes,
        )

    async def _map_in_batches(
        self,
        items: list[Any],
        batch_size: int,
        fn: Callable[[Any], Awaitable[Any]],
        on_item_done: Callable[[Any], None] | None = None,
    ) -> list[Any]:
        return await self.generation.map_in_batches(items, batch_size, fn, on_item_done)

    async def generate(
        self,
        project_data: Any,
        roles: list[Any],
        synopsis: str,
        scope: Any,
        on_section_done: Callable[[str], None] | None = None,
    ) -> Any:
        return await self.generation.generate(
            project_data,
            roles,
            synopsis,
            scope,
            on_section_done,
        )

    async def generate_required_elements(
        self,
        section_title: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
    ) -> list[Any]:
        return await self.generation.generate_required_elements(
            section_title,
            target_markets,
            device_category,
            intended_use,
        )

    async def analyze_section(
        self,
        section_title: str,
        section_content: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
        required_elements: list[Any] | None = None,
        amendment_context: dict[str, Any] | None = None,
        cross_section_context: list[Any] | None = None,
        accepted_requirements: Any = None,
        synopsis_excerpt: str | None = None,
        protocol_attachments: list[Any] | None = None,
        previous_decisions: list[Any] | None = None,
    ) -> Any:
        return await self.analysis.analyze_section(
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
            protocol_attachments,
            previous_decisions,
        )

    async def check_attachments(
        self,
        issue: str,
        requirement: str | None,
        attachments: list[Any],
    ) -> Any:
        return await self.analysis.check_attachments(issue, requirement, attachments)

    # Compatibility helpers used by parity tests and older callers.
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

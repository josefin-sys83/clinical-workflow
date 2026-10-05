from __future__ import annotations

import asyncio
import random
import re
from datetime import datetime
from typing import Any, Awaitable, Callable

from clinical_ai.llm import LLMGateway
from clinical_ai.utils import get_value
from .models import GenerateRequiredElementsResponse
from .prompts import (
    generate_protocol_section_prompt,
    generate_required_elements_prompt,
)
from .rules import PROTOCOL_SECTION_TITLES


class ProtocolGenerationService:
    """Protocol generation workflows only."""

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
        # TODO: Source accepted regulatory requirements from the main backend
        # through the project-context bridge.
        regulatory_refs = get_value(scope, "requirements", "") or ""
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
            raise RuntimeError(
                f'AI generation failed for protocol section "{section_title}": '
                "empty response after retries"
            )
        return content

    async def map_in_batches(
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
        contents = await self.map_in_batches(
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
        result = await self.llm.complete_structured(
            generate_required_elements_prompt(
                section_title,
                target_markets,
                device_category,
                intended_use,
            ),
            response_model=GenerateRequiredElementsResponse,
        )
        return [element.model_dump() for element in result.requiredElements]
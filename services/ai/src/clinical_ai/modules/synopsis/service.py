from __future__ import annotations

import json
import re
from typing import Any

from clinical_ai.llm import LLMGateway
from .prompts import analyze_synopsis_prompt


class SynopsisService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def analyze(self, text: str, target_markets: list[str] | None = None) -> list[Any]:
        result = await self.llm.complete(analyze_synopsis_prompt(text, target_markets or []))
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            return json.loads(clean)
        except Exception:
            return []

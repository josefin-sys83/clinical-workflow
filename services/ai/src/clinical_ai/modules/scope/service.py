from __future__ import annotations

import json
import re
from typing import Any

from clinical_ai.llm import LLMGateway
from .prompts import analyze_scope_prompt, derive_scope_prompt


class ScopeService:
    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def derive_from_synopsis(self, text: str) -> dict[str, Any]:
        result = await self.llm.complete(derive_scope_prompt(text))
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            parsed = json.loads(clean)
            if parsed.get("deviceCategory") and parsed.get("intendedUse"):
                return parsed
        except Exception:
            pass
        return {"deviceCategory": "", "intendedUse": "", "confidence": "low"}

    async def analyze(self, client_prompt: str) -> list[Any]:
        result = await self.llm.complete(analyze_scope_prompt(client_prompt))
        try:
            clean = re.sub(r"```json|```", "", result).strip()
            return json.loads(clean)
        except Exception:
            return []

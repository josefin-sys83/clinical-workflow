from __future__ import annotations

from typing import Protocol

from .types import LLMRequest, LLMResponse


class LLMProvider(Protocol):
    async def complete_once(self, request: LLMRequest) -> LLMResponse:
        """Perform exactly one provider request. Retry/queue policy lives in LLMGateway."""
        ...

    def missing_config(self) -> list[str]:
        """Return missing provider-specific configuration names."""
        ...

    async def aclose(self) -> None:
        ...

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


PROMPT_CONTENT_DELIMITER = "\n\n---CONTENT-TO-REVIEW---\n\n"


@dataclass(frozen=True)
class PromptSpec:
    """Exact legacy prompt + model call settings from the old TypeScript service."""

    prompt: str
    max_tokens: int = 2000
    temperature: float = 0.3

    @classmethod
    def from_parts(
        cls,
        *,
        system: str,
        user: str,
        max_tokens: int,
        temperature: float,
    ) -> "PromptSpec":
        return cls(
            prompt=f"{system}{PROMPT_CONTENT_DELIMITER}{user}",
            max_tokens=max_tokens,
            temperature=temperature,
        )


@dataclass(frozen=True)
class LLMRequest:
    messages: list[dict[str, Any]]
    max_tokens: int
    temperature: float
    json_mode: bool


@dataclass(frozen=True)
class LLMResponse:
    text: str

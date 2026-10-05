from __future__ import annotations

from dataclasses import dataclass
from typing import Any


PROMPT_CONTENT_DELIMITER = "\n\n---CONTENT-TO-REVIEW---\n\n"


@dataclass(frozen=True)
class PromptSpec:
    """Prompt messages + model call settings."""

    system: str
    user: str
    max_tokens: int = 2000
    temperature: float = 0.3
    frequency_penalty: float = 0.0
    image_data_url: str | None = None

    @classmethod
    def from_parts(
        cls,
        *,
        system: str,
        user: str,
        max_tokens: int,
        temperature: float,
        frequency_penalty: float = 0.0,
    ) -> "PromptSpec":
        return cls(
            system=system,
            user=user,
            max_tokens=max_tokens,
            temperature=temperature,
            frequency_penalty=frequency_penalty,
        )

    @property
    def prompt(self) -> str:
        """Legacy combined representation for compatibility with older callers/tests."""
        return f"{self.system}{PROMPT_CONTENT_DELIMITER}{self.user}"


@dataclass(frozen=True)
class LLMRequest:
    messages: list[dict[str, Any]]
    max_tokens: int
    temperature: float
    json_mode: bool
    frequency_penalty: float = 0.0
    response_schema: dict[str, Any] | None = None
    response_schema_name: str | None = None


@dataclass(frozen=True)
class LLMResponse:
    text: str

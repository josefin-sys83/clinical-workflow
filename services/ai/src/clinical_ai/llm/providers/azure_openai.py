from __future__ import annotations

from dataclasses import dataclass
import math
import os
import re

import httpx

from clinical_ai.llm.exceptions import LLMHTTPError, LLMNetworkError, LLMRateLimitError
from clinical_ai.llm.types import LLMRequest, LLMResponse


@dataclass(frozen=True)
class AzureOpenAIConfig:
    endpoint: str = ""
    deployment: str = ""
    api_version: str = ""
    api_key: str = ""

    @classmethod
    def from_env(cls) -> "AzureOpenAIConfig":
        return cls(
            endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", ""),
            deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", ""),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", ""),
            api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
        )

    def missing_config(self) -> list[str]:
        values = {
            "AZURE_OPENAI_ENDPOINT": self.endpoint,
            "AZURE_OPENAI_DEPLOYMENT": self.deployment,
            "AZURE_OPENAI_API_VERSION": self.api_version,
            "AZURE_OPENAI_API_KEY": self.api_key,
        }
        return [name for name, value in values.items() if not value]


def _js_parse_float(value: str) -> float:
    match = re.match(r"^[\s]*([+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?)", value)
    if not match:
        return math.nan
    try:
        return float(match.group(1))
    except ValueError:
        return math.nan


class AzureOpenAIProvider:
    """Azure-specific HTTP transport only."""

    def __init__(self, config: AzureOpenAIConfig):
        self._config = config
        self._client = httpx.AsyncClient(timeout=None)

    def missing_config(self) -> list[str]:
        return self._config.missing_config()

    async def complete_once(self, request: LLMRequest) -> LLMResponse:
        endpoint = self._config.endpoint
        deployment = self._config.deployment
        api_version = self._config.api_version

        url = f"{endpoint}openai/deployments/{deployment}/chat/completions?api-version={api_version}"
        body: dict = {
            "messages": request.messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }
        if request.json_mode:
            body["response_format"] = {"type": "json_object"}

        try:
            response = await self._client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "api-key": self._config.api_key,
                },
                json=body,
            )
        except httpx.RequestError as exc:
            raise LLMNetworkError(str(exc)) from exc

        if response.status_code == 429:
            retry_after = response.headers.get("retry-after")
            retry_after_seconds: float | None = None
            if retry_after is not None:
                parsed = _js_parse_float(retry_after)
                retry_after_seconds = 0.0 if math.isnan(parsed) else max(0.0, parsed)
            raise LLMRateLimitError(retry_after_seconds)

        if not response.is_success:
            raise LLMHTTPError(response.status_code, (response.text or "")[:500])

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
        return LLMResponse(text=content)

    async def aclose(self) -> None:
        await self._client.aclose()

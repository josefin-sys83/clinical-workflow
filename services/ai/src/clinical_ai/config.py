from __future__ import annotations

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    """Application-level AI settings only.

    Provider-specific configuration belongs in app.llm.providers.
    """

    llm_provider: str = "azure_openai"
    ai_concurrency_limit: int = 6
    ai_queue_max_wait_ms: int = 25_000
    ai_call_timeout_ms: int = 45_000
    ai_max_attempts: int = 5
    ai_service_token: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            llm_provider=os.getenv("LLM_PROVIDER", "azure_openai").strip().lower(),
            ai_concurrency_limit=int(os.getenv("AI_CONCURRENCY_LIMIT", "6")),
            ai_queue_max_wait_ms=int(os.getenv("AI_QUEUE_MAX_WAIT_MS", "25000")),
            ai_call_timeout_ms=int(os.getenv("AI_CALL_TIMEOUT_MS", "45000")),
            ai_max_attempts=int(os.getenv("AI_MAX_ATTEMPTS", "5")),
            ai_service_token=os.getenv("AI_SERVICE_TOKEN", ""),
        )

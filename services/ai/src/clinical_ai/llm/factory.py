from __future__ import annotations

from clinical_ai.config import Settings
from .provider import LLMProvider
from .providers.azure_openai import AzureOpenAIConfig, AzureOpenAIProvider


def create_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "azure_openai":
        return AzureOpenAIProvider(AzureOpenAIConfig.from_env())

    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")

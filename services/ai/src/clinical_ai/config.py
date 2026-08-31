from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every environment variable the service reads, in one place.

    Nothing else in the codebase should touch os.environ directly — that way the full
    configuration surface is visible here and can be validated at startup rather than
    failing on the first request that happens to need a missing value.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000

    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = ""

    # Shared secret proving a request came from our NestJS backend. This service is
    # deployed with internal-only ingress, so this is defence in depth rather than the
    # only thing standing between it and the internet.
    ai_service_token: str = ""

    ai_concurrency_limit: int = 6
    ai_queue_max_wait_ms: int = 25_000

    @property
    def azure_configured(self) -> bool:
        return bool(
            self.azure_openai_endpoint
            and self.azure_openai_api_key
            and self.azure_openai_deployment
            and self.azure_openai_api_version
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

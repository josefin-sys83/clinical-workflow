class LLMProviderError(Exception):
    pass


class LLMRateLimitError(LLMProviderError):
    def __init__(self, retry_after_seconds: float | None = None):
        super().__init__("LLM provider rate limited the request")
        self.retry_after_seconds = retry_after_seconds


class LLMHTTPError(LLMProviderError):
    def __init__(self, status_code: int, body: str = ""):
        super().__init__(f"LLM provider returned HTTP {status_code}")
        self.status_code = status_code
        self.body = body


class LLMNetworkError(LLMProviderError):
    pass

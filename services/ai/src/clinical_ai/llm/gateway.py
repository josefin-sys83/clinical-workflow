from __future__ import annotations

import asyncio
import logging
from collections import deque
from typing import Any

from clinical_ai.config import Settings
from clinical_ai.errors import GatewayTimeoutException, ServiceUnavailableException
from .exceptions import LLMHTTPError, LLMNetworkError, LLMRateLimitError
from .provider import LLMProvider
from .types import LLMRequest, PROMPT_CONTENT_DELIMITER, PromptSpec

logger = logging.getLogger(__name__)


class LLMGateway:
    """Provider-independent LLM execution with concurrency, retries, and timeout handling."""

    def __init__(self, provider: LLMProvider, settings: Settings):
        self.provider = provider
        self.settings = settings
        self._active_count = 0
        self._wait_queue: deque[dict[str, Any]] = deque()

    async def _acquire_slot(self) -> None:
        if self._active_count < self.settings.ai_concurrency_limit:
            self._active_count += 1
            return

        loop = asyncio.get_running_loop()
        future: asyncio.Future[None] = loop.create_future()
        waiter: dict[str, Any] = {"future": future, "timer": None}

        def on_timeout() -> None:
            try:
                self._wait_queue.remove(waiter)
            except ValueError:
                pass
            if not future.done():
                future.set_exception(
                    ServiceUnavailableException(
                        "The AI service is busy right now. Please try again in a moment."
                    )
                )

        waiter["timer"] = loop.call_later(
            self.settings.ai_queue_max_wait_ms / 1000,
            on_timeout,
        )
        self._wait_queue.append(waiter)
        await future

    def _release_slot(self) -> None:
        if self._wait_queue:
            waiter = self._wait_queue.popleft()
            timer = waiter.get("timer")
            if timer is not None:
                timer.cancel()
            future = waiter["future"]
            if not future.done():
                future.set_result(None)
        else:
            self._active_count -= 1

    async def complete(self, spec: PromptSpec | str, max_tokens: int = 2000, temperature: float = 0.3) -> str:
        if isinstance(spec, PromptSpec):
            prompt = spec.prompt
            max_tokens = spec.max_tokens
            temperature = spec.temperature
        else:
            prompt = spec

        await self._acquire_slot()
        try:
            return await self._complete_with_retry(prompt, max_tokens, temperature)
        finally:
            self._release_slot()

    def _make_request(self, prompt: str, max_tokens: int, temperature: float) -> LLMRequest:
        delimiter_idx = prompt.find(PROMPT_CONTENT_DELIMITER)
        if delimiter_idx == -1:
            messages = [{"role": "user", "content": prompt}]
        else:
            messages = [
                {"role": "system", "content": prompt[:delimiter_idx]},
                {
                    "role": "user",
                    "content": prompt[delimiter_idx + len(PROMPT_CONTENT_DELIMITER):],
                },
            ]

        return LLMRequest(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            json_mode="Return ONLY this JSON" in prompt,
        )

    async def _sleep(self, seconds: float) -> None:
        await asyncio.sleep(max(0.0, seconds))

    async def _complete_with_retry(self, prompt: str, max_tokens: int, temperature: float) -> str:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + (self.settings.ai_call_timeout_ms / 1000)
        max_attempts = self.settings.ai_max_attempts
        request = self._make_request(prompt, max_tokens, temperature)

        for attempt in range(max_attempts):
            remaining = deadline - loop.time()
            if remaining <= 0:
                raise self._timeout(attempt, max_attempts)

            try:
                response = await asyncio.wait_for(
                    self.provider.complete_once(request),
                    timeout=remaining,
                )
            except asyncio.TimeoutError as exc:
                raise self._timeout(attempt, max_attempts) from exc
            except LLMRateLimitError as exc:
                if attempt < max_attempts - 1:
                    delay = exc.retry_after_seconds
                    if delay is None:
                        delay = 2.0 * (attempt + 1)
                    await self._sleep(delay)
                    continue
                logger.error(
                    "[AI] exhausted all %s retries after repeated 429 rate-limit responses, returning empty response",
                    max_attempts,
                )
                return ""
            except LLMHTTPError as exc:
                if attempt < max_attempts - 1:
                    await self._sleep(2.0 * (attempt + 1))
                    continue
                logger.error(
                    "[AI] exhausted all %s retries, last response status %s: %s",
                    max_attempts,
                    exc.status_code,
                    exc.body[:500],
                )
                return ""
            except LLMNetworkError as exc:
                if attempt < max_attempts - 1:
                    await self._sleep(2.0)
                    continue
                logger.error("[AI] exhausted all %s retries, last error: %r", max_attempts, exc)
                return ""
            except Exception as exc:
                if attempt < max_attempts - 1:
                    await self._sleep(2.0)
                    continue
                logger.error("[AI] exhausted all %s retries, last error: %r", max_attempts, exc)
                return ""

            if not response.text and attempt < max_attempts - 1:
                await self._sleep(2.0)
                continue
            return response.text

        logger.error("[AI] exhausted all %s retries, returning empty response", max_attempts)
        return ""

    def _timeout(self, attempt: int, max_attempts: int) -> GatewayTimeoutException:
        logger.error(
            "[AI] call timed out after %sms (attempt %s/%s), giving up",
            self.settings.ai_call_timeout_ms,
            attempt + 1,
            max_attempts,
        )
        return GatewayTimeoutException(
            "The AI service did not respond in time. Please try again in a moment — "
            "if this keeps happening, the AI provider may be experiencing an outage."
        )

from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from clinical_ai.ai_service import AiService
from clinical_ai.api import router
from clinical_ai.config import Settings
from clinical_ai.errors import GatewayTimeoutException, ServiceUnavailableException
from clinical_ai.llm import LLMGateway, create_llm_provider

logging.basicConfig(level=logging.INFO)


def _nest_error(status_code: int, message: str, error: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"statusCode": status_code, "message": message, "error": error},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    provider = create_llm_provider(settings)
    llm = LLMGateway(provider, settings)
    ai = AiService(llm)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await provider.aclose()

    app = FastAPI(title="Clinical Workflow AI Service", version="1.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.ai = ai
    app.state.llm_provider = provider

    @app.exception_handler(ServiceUnavailableException)
    async def service_unavailable_handler(_, exc: ServiceUnavailableException):
        return _nest_error(503, str(exc), "Service Unavailable")

    @app.exception_handler(GatewayTimeoutException)
    async def gateway_timeout_handler(_, exc: GatewayTimeoutException):
        return _nest_error(504, str(exc), "Gateway Timeout")

    app.include_router(router)
    return app


app = create_app()

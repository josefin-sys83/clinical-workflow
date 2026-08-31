from fastapi import FastAPI

from clinical_ai.api.v1.router import router as v1_router
from clinical_ai.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Clinical AI Service",
        version="0.1.0",
        description=(
            "Internal AI service for the Clinical Investigation Platform. Called only by "
            "the NestJS backend — never by the browser. It holds no database connection "
            "and no user model: authentication, authorisation, audit logging and "
            "persistence all stay in the backend."
        ),
    )

    @app.get("/health")
    def health() -> dict:
        """Liveness probe.

        Reports whether Azure OpenAI credentials are present, but deliberately does not
        call Azure — a health check that depends on a third party will fail the container
        for reasons that have nothing to do with the container.
        """
        return {
            "status": "ok",
            "service": "clinical-ai",
            "azure_configured": settings.azure_configured,
        }

    app.include_router(v1_router, prefix="/v1")

    return app


app = create_app()

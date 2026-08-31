FROM python:3.12-slim

WORKDIR /app

# Copy the manifest first so dependency installation is cached independently of source
# changes — editing a prompt template shouldn't reinstall FastAPI.
COPY pyproject.toml ./
COPY src/ ./src/
RUN pip install --no-cache-dir .

ENV PORT=8000
EXPOSE 8000

# Deployed with internal-only ingress, so it binds 0.0.0.0 to be reachable from the
# NestJS container inside the Container Apps environment — not from the public internet.
CMD ["sh", "-c", "uvicorn clinical_ai.main:app --host 0.0.0.0 --port ${PORT}"]

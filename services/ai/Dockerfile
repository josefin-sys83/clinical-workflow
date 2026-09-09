FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml ./
COPY src/ ./src/

RUN pip install --no-cache-dir .

ENV PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "uvicorn clinical_ai.main:app --host 0.0.0.0 --port ${PORT}"]

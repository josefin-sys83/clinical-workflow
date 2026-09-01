# Clinical AI Service

Python/FastAPI service for the Clinical Workflow platform's AI capabilities.

## Running It

From `services/ai`:

```bash
cp .env.example .env
```

Fill in the required configuration, then start the service:

```bash
uvicorn clinical_ai.main:app \
  --app-dir src \
  --host 127.0.0.1 \
  --port 8001 \
  --reload \
  --env-file .env
```

The service can also be installed locally for development:

```bash
python3 -m venv .venv
source .venv/bin/activate

pip install -e ".[dev]"

uvicorn clinical_ai.main:app \
  --host 127.0.0.1 \
  --port 8001 \
  --reload \
  --env-file .env
```

Check the service:

```bash
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/ready
```

Run tests with:

```bash
pytest
```

## Layout

```text
src/clinical_ai/
├── main.py          FastAPI application and health/readiness endpoints
├── config.py        Service and AI runtime configuration
├── ai_service.py    Facade connecting API routes to AI modules
├── errors.py        Service-level exceptions
├── utils.py         Shared deterministic helpers
│
├── api/
│   ├── routes.py    Internal HTTP endpoints
│   └── schemas.py   Request and response models
│
├── modules/
│   ├── synopsis/    Synopsis analysis
│   ├── scope/       Scope derivation and analysis
│   ├── protocol/    Protocol generation, review and validation
│   ├── report/      Report generation, review and validation
│   └── consistency/ Cross-document consistency checks
│
└── llm/
    ├── gateway.py   Concurrency, queueing, retries and timeouts
    ├── provider.py  LLM provider contract
    ├── factory.py   Provider selection
    ├── types.py     Prompt and LLM request types
    ├── exceptions.py
    └── providers/
        └── azure_openai.py
```

## AI Modules

* `synopsis` — synopsis readiness and regulatory analysis
* `scope` — device category and intended-use derivation
* `protocol` — protocol generation, review, requirements, and validation
* `report` — Clinical Investigation Report generation, review, and statistical validation
* `consistency` — synopsis, protocol, report, and statistical consistency checks

## LLM Layer

The LLM layer separates provider-independent execution from provider-specific integration.

`gateway.py` handles:

* concurrency limiting
* request queueing
* retries and backoff
* `Retry-After` handling
* overall AI call timeout
* trusted and untrusted prompt-content separation
* JSON-mode detection

`provider.py` defines the provider contract.

`factory.py` selects the configured provider.

`providers/azure_openai.py` contains the Azure OpenAI integration and provider-specific configuration.

## Configuration

Create a local `.env` file from `.env.example`.

```env
# Service runtime
PORT=8001

# LLM provider selection
LLM_PROVIDER=azure_openai

# Internal service authentication
AI_SERVICE_TOKEN=change-me

# AI execution limits
AI_CONCURRENCY_LIMIT=6
AI_QUEUE_MAX_WAIT_MS=25000
AI_CALL_TIMEOUT_MS=45000
AI_MAX_ATTEMPTS=5

# Azure OpenAI provider
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=YOUR-DEPLOYMENT
AZURE_OPENAI_API_VERSION=YOUR-API-VERSION
AZURE_OPENAI_API_KEY=YOUR-KEY
```

The real `.env` file is local runtime configuration and must not be committed.

## Runtime Limits

The AI gateway uses the operational limits migrated from the existing AI implementation:

```text
Concurrent AI calls:   6
Queue timeout:         25 seconds
Overall call timeout:  45 seconds
Maximum attempts:      5
```

Retry handling and provider throttling are managed by the LLM gateway.

## Health Checks

Service health:

```bash
curl http://127.0.0.1:8001/health
```

Expected response:

```json
{
  "ok": true
}
```

Provider readiness:

```bash
curl http://127.0.0.1:8001/ready
```

Expected response:

```json
{
  "ok": true,
  "provider": "azure_openai"
}
```

## Backend Integration

Configure the backend with:

```env
PYTHON_AI_SERVICE_URL=http://127.0.0.1:8001
AI_SERVICE_TOKEN=...
```

The same `AI_SERVICE_TOKEN` must be configured for both services.

The frontend continues to communicate with the backend and does not call the AI service directly.

## Docker

Build the service:

```bash
cd services/ai
docker build -t clinical-ai .
```

Run locally:

```bash
docker run --rm \
  --env-file .env \
  -p 8001:8001 \
  clinical-ai
```

Runtime configuration and secrets are supplied through environment variables and are not stored in the image.

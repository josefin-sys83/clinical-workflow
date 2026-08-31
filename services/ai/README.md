# Clinical AI Service

Python/FastAPI service that will take over the AI work currently implemented in
TypeScript at `system/backend/src/modules/ai/ai.service.ts`.

Owned end to end by the AI team. Its dependencies, test framework, formatter and CI job
are independent of the TypeScript apps — nobody will ask you to match their tooling.

## Running it

```bash
cd services/ai
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # fill in the Azure OpenAI values
uvicorn clinical_ai.main:app --reload --port 8000
```

Then `curl localhost:8000/health`.

Run the tests with `pytest`.

## Layout

```
src/clinical_ai/
  main.py       FastAPI app factory, /health, router mounting
  config.py     every environment variable, in one place
  api/v1/       one module per workflow stage (synopsis, scope, protocol, report, ...)
  schemas/      pydantic request/response models — THE contract
  domain/       section titles, regulatory standards, other shared data
  prompts/      prompt templates as files, not string literals
  core/         Azure OpenAI client, concurrency limiting, error mapping
tests/
```

## Ground rules

- **Never talk to the database, never talk to the frontend.** Everything needed arrives
  in the request body. If something is missing, that is a contract change to negotiate,
  not a query to write.
- **The pydantic schemas are the contract.** Changing one changes the types the NestJS
  client generates, so call out schema changes in the PR description.
- **The service must run standalone** — uvicorn plus an Azure OpenAI key, no Postgres,
  no NestJS. If it can't, the boundary has leaked.
- **No live model calls in CI.** Use fixtures; put anything that hits Azure behind a
  separate, manually triggered job.
- **Errors must be typed, not generic 500s.** The backend already distinguishes "busy"
  from "timed out" from "failed" and shows different UI for each — preserve that
  distinction in the status codes you return.
- **Prompts live in `prompts/` as files.** The current ones are buried in TypeScript
  string literals where they can't be diffed or reviewed by a regulatory person.

## Concurrency

Port the existing limiter rather than reinventing it: a ceiling of 6 concurrent Azure
calls with a 25-second queue timeout. The comments in `ai.service.ts` explain why those
numbers — load testing showed 24 concurrent users driving single-call latency from a few
seconds to 40-105 seconds — and are worth reading before deleting that file.

## Deployment

Deployed as a second Azure Container App in the same environment as the main app, with
**internal ingress only** — reachable from the NestJS container, never from the public
internet. The NestJS backend calls it over the environment's internal DNS.

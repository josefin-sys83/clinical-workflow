"""Exercise the real Python routes/prompts without making an LLM/network call.

Used by ai-python-contract.spec.ts when AI_CONTRACT_PYTHON is explicitly set.
"""
import asyncio
import json
import sys
from types import SimpleNamespace

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from clinical_ai.ai_service import AiService
from clinical_ai.api.routes import get_ai, router

request = json.load(sys.stdin)
prompts = []


class FixtureGateway:
    async def complete(self, prompt):
        prompts.append({"system": prompt.system, "user": prompt.user})
        result = request["llmResult"]
        return result if isinstance(result, str) else json.dumps(result)

    async def complete_structured(self, prompt, response_model):
        prompts.append({"system": prompt.system, "user": prompt.user})
        return response_model.model_validate(request["llmResult"])


app = FastAPI()
app.include_router(router)
app.state.settings = SimpleNamespace(ai_service_token="")
app.state.ai = AiService(FixtureGateway())


async def fixture_ai():
    return app.state.ai


# Keep the probe on a single event loop; no test-server threads or sockets.
app.dependency_overrides[get_ai] = fixture_ai

# Pydantic otherwise silently ignores extra top-level fields. Fail the contract
# probe if the backend sends something the receiving route doesn't declare.
route = next(route for route in router.routes if route.path == request["path"])
model = route.dependant.body_params[0].type_
assert not (set(request["body"]) - set(model.model_fields)), "Unknown AI request fields"
model.model_validate(request["body"], strict=True)

async def main():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://contract.test") as client:
        response = await client.post(request["path"], json=request["body"])
        print(json.dumps({"status": response.status_code, "body": response.text, "prompts": prompts}))


asyncio.run(main())

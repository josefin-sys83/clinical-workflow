from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse

from clinical_ai.ai_service import AiService
from clinical_ai.modules.protocol.rules import PROTOCOL_SECTION_TITLES
from .schemas import *

from clinical_ai.errors import GatewayTimeoutException, ServiceUnavailableException

logger = logging.getLogger(__name__)
router = APIRouter()


def get_ai(request: Request) -> AiService:
    return request.app.state.ai


async def require_internal_token(request: Request, authorization: str | None = Header(default=None)) -> None:
    expected = request.app.state.settings.ai_service_token
    if not expected:
        return
    if authorization != f'Bearer {expected}':
        raise HTTPException(status_code=401, detail='Unauthorized')


@router.get('/health')
async def health() -> dict[str, bool]:
    return {'ok': True}


@router.get('/ready')
async def ready(request: Request):
    missing = request.app.state.llm_provider.missing_config()
    if missing:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={'ok': False, 'missing': missing})
    return {'ok': True, 'provider': request.app.state.settings.llm_provider}


@router.get('/v1/ai/protocol-section-titles', dependencies=[Depends(require_internal_token)])
async def protocol_section_titles():
    return PROTOCOL_SECTION_TITLES


@router.post('/v1/ai/analyze-synopsis', dependencies=[Depends(require_internal_token)])
async def analyze_synopsis(req: AnalyzeSynopsisRequest, ai: AiService = Depends(get_ai)):
    return await ai.analyzeSynopsis(req.text, req.targetMarkets)


@router.post('/v1/ai/derive-scope-from-synopsis', dependencies=[Depends(require_internal_token)])
async def derive_scope(req: DeriveScopeRequest, ai: AiService = Depends(get_ai)):
    return await ai.deriveScopeFromSynopsis(req.text)


@router.post('/v1/ai/analyze-scope', dependencies=[Depends(require_internal_token)])
async def analyze_scope(req: AnalyzeScopeRequest, ai: AiService = Depends(get_ai)):
    return await ai.analyzeScope(req.clientPrompt)


@router.post('/v1/ai/generate-protocol-section', dependencies=[Depends(require_internal_token)])
async def generate_protocol_section(req: GenerateProtocolSectionRequest, ai: AiService = Depends(get_ai)):
    return await ai.generateProtocolSection(req.sectionTitle, req.projectData, req.synopsis, req.scope, req.additionalFixes)


@router.post('/v1/ai/generate-protocol', dependencies=[Depends(require_internal_token)])
async def generate_protocol(req: GenerateProtocolRequest, ai: AiService = Depends(get_ai)):
    return await ai.generateProtocol(req.projectData, req.roles, req.synopsis, req.scope)


@router.post('/v1/ai/generate-protocol/stream', dependencies=[Depends(require_internal_token)])
async def generate_protocol_stream(req: GenerateProtocolRequest, ai: AiService = Depends(get_ai)):
    async def events():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

        def on_section_done(title: str) -> None:
            queue.put_nowait({'type': 'sectionDone', 'title': title})

        async def run_generation() -> None:
            try:
                result = await ai.generateProtocol(req.projectData, req.roles, req.synopsis, req.scope, on_section_done)
                await queue.put({'type': 'result', 'data': result})
            except ServiceUnavailableException as exc:
                await queue.put({'type': 'error', 'statusCode': 503, 'message': str(exc)})
            except GatewayTimeoutException as exc:
                await queue.put({'type': 'error', 'statusCode': 504, 'message': str(exc)})
            except Exception:
                logger.exception('generateProtocol stream failed')
                await queue.put({'type': 'error', 'statusCode': 500, 'message': 'Internal server error'})
            finally:
                await queue.put(None)

        task = asyncio.create_task(run_generation())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield json.dumps(event, ensure_ascii=False, separators=(',', ':')) + '\n'
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(events(), media_type='application/x-ndjson')


@router.post('/v1/ai/generate-required-elements', dependencies=[Depends(require_internal_token)])
async def generate_required_elements(req: GenerateRequiredElementsRequest, ai: AiService = Depends(get_ai)):
    return await ai.generateRequiredElements(req.sectionTitle, req.targetMarkets, req.deviceCategory, req.intendedUse)


@router.post('/v1/ai/analyze-section', dependencies=[Depends(require_internal_token)])
async def analyze_section(req: AnalyzeSectionRequest, ai: AiService = Depends(get_ai)):
    return await ai.analyzeSection(
        req.sectionTitle, req.sectionContent, req.targetMarkets, req.deviceCategory, req.intendedUse,
        req.requiredElements, req.amendmentContext, req.crossSectionContext, req.acceptedRequirements, req.synopsisExcerpt,
    )


@router.post('/v1/ai/generate-report-section', dependencies=[Depends(require_internal_token)])
async def generate_report_section(req: GenerateReportSectionRequest, ai: AiService = Depends(get_ai)):
    return await ai.generateReportSection(
        req.sectionTitle, req.sectionNumber, req.protocolSections, req.synopsis, req.scope,
        req.projectData, req.roles, req.existingReportSections,
    )


@router.post('/v1/ai/analyze-report-section', dependencies=[Depends(require_internal_token)])
async def analyze_report_section(req: AnalyzeReportSectionRequest, ai: AiService = Depends(get_ai)):
    return await ai.analyzeReportSection(
        req.sectionTitle, req.sectionContent, req.targetMarkets, req.deviceCategory,
        req.intendedUse, req.appendicesList, req.amendmentContext,
    )


@router.post('/v1/ai/validate-statistical-values', dependencies=[Depends(require_internal_token)])
async def validate_statistical_values(req: ValidateStatisticalValuesRequest, ai: AiService = Depends(get_ai)):
    return ai.validateStatisticalValues(req.sectionContent, req.sectionTitle)


@router.post('/v1/ai/check-statistical-consistency', dependencies=[Depends(require_internal_token)])
async def check_statistical_consistency(req: CheckStatisticalConsistencyRequest, ai: AiService = Depends(get_ai)):
    return await ai.checkStatisticalConsistency(req.statisticalMethodsContent, req.resultsContent, req.targetMarkets)


@router.post('/v1/ai/check-cross-consistency', dependencies=[Depends(require_internal_token)])
async def check_cross_consistency(req: CheckCrossConsistencyRequest, ai: AiService = Depends(get_ai)):
    return await ai.checkCrossConsistency(req.protocolSections, req.reportSections, req.targetMarkets, req.deviceCategory)


@router.post('/v1/ai/check-synopsis-consistency', dependencies=[Depends(require_internal_token)])
async def check_synopsis_consistency(req: CheckSynopsisConsistencyRequest, ai: AiService = Depends(get_ai)):
    return await ai.checkSynopsisConsistency(req.synopsisText, req.protocolSections)

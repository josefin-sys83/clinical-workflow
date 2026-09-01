from __future__ import annotations

from typing import Any, Awaitable, Callable

from clinical_ai.llm import LLMGateway
from clinical_ai.modules.consistency.service import ConsistencyService
from clinical_ai.modules.protocol.service import ProtocolService
from clinical_ai.modules.report.service import ReportService
from clinical_ai.modules.scope.service import ScopeService
from clinical_ai.modules.synopsis.service import SynopsisService


class AiService:
    """Application facade for AI operations across synopsis, scope, protocol, report, and consistency workflows."""

    def __init__(self, llm: LLMGateway):
        self.llm = llm
        self.synopsis = SynopsisService(llm)
        self.scope = ScopeService(llm)
        self.protocol = ProtocolService(llm)
        self.report = ReportService(llm)
        self.consistency = ConsistencyService(llm)

    async def analyzeSynopsis(self, text: str, targetMarkets: list[str] | None = None):
        return await self.synopsis.analyze(text, targetMarkets)

    async def deriveScopeFromSynopsis(self, text: str):
        return await self.scope.derive_from_synopsis(text)

    async def analyzeScope(self, clientPrompt: str):
        return await self.scope.analyze(clientPrompt)

    async def generateProtocolSection(
        self,
        sectionTitle: str,
        projectData: Any,
        synopsis: str,
        scope: Any,
        additionalFixes: str | None = None,
    ):
        return await self.protocol.generate_section(sectionTitle, projectData, synopsis, scope, additionalFixes)

    async def mapInBatches(
        self,
        items: list[Any],
        batchSize: int,
        fn: Callable[[Any], Awaitable[Any]],
        onItemDone: Callable[[Any], None] | None = None,
    ):
        return await self.protocol._map_in_batches(items, batchSize, fn, onItemDone)

    async def generateProtocol(
        self,
        projectData: Any,
        roles: list[Any],
        synopsis: str,
        scope: Any,
        onSectionDone: Callable[[str], None] | None = None,
    ):
        return await self.protocol.generate(projectData, roles, synopsis, scope, onSectionDone)

    async def generateRequiredElements(
        self,
        sectionTitle: str,
        targetMarkets: list[str],
        deviceCategory: str,
        intendedUse: str,
    ):
        return await self.protocol.generate_required_elements(sectionTitle, targetMarkets, deviceCategory, intendedUse)

    async def analyzeSection(
        self,
        sectionTitle: str,
        sectionContent: str,
        targetMarkets: list[str],
        deviceCategory: str,
        intendedUse: str,
        requiredElements: list[Any] | None = None,
        amendmentContext: dict[str, Any] | None = None,
        crossSectionContext: list[dict[str, str]] | None = None,
        acceptedRequirements: str | None = None,
        synopsisExcerpt: str | None = None,
    ):
        return await self.protocol.analyze_section(
            sectionTitle,
            sectionContent,
            targetMarkets,
            deviceCategory,
            intendedUse,
            requiredElements,
            amendmentContext,
            crossSectionContext,
            acceptedRequirements,
            synopsisExcerpt,
        )

    async def generateReportSection(
        self,
        sectionTitle: Any,
        sectionNumber: Any,
        protocolSections: list[Any],
        synopsis: Any,
        scope: Any,
        projectData: Any,
        roles: list[Any],
        existingReportSections: list[Any],
    ):
        return await self.report.generate_section(
            sectionTitle,
            sectionNumber,
            protocolSections,
            synopsis,
            scope,
            projectData,
            roles,
            existingReportSections,
        )

    async def analyzeReportSection(
        self,
        sectionTitle: Any,
        sectionContent: Any,
        targetMarkets: Any,
        deviceCategory: Any,
        intendedUse: Any,
        appendicesList: list[str] | None = None,
        amendmentContext: dict[str, Any] | None = None,
    ):
        return await self.report.analyze_section(
            sectionTitle,
            sectionContent,
            targetMarkets,
            deviceCategory,
            intendedUse,
            appendicesList,
            amendmentContext,
        )

    def validateStatisticalValues(self, sectionContent: str, sectionTitle: str):
        return self.report.validate_statistical_values(sectionContent, sectionTitle)

    async def checkStatisticalConsistency(
        self,
        statisticalMethodsContent: str,
        resultsContent: str,
        targetMarkets: list[str],
    ):
        return await self.consistency.check_statistical_consistency(
            statisticalMethodsContent,
            resultsContent,
            targetMarkets,
        )

    async def checkCrossConsistency(
        self,
        protocolSections: list[dict[str, str]],
        reportSections: list[dict[str, str]],
        targetMarkets: list[str],
        deviceCategory: str,
    ):
        return await self.consistency.check_cross_consistency(
            protocolSections,
            reportSections,
            targetMarkets,
            deviceCategory,
        )

    async def checkSynopsisConsistency(
        self,
        synopsisText: str,
        protocolSections: list[dict[str, str]],
    ):
        return await self.consistency.check_synopsis_consistency(synopsisText, protocolSections)

    # Compatibility helpers retained while migrating callers/tests.
    def quoteAppearsInSource(self, quote: Any, sourceContent: str):
        return self.protocol.quote_appears_in_source(quote, sourceContent)

    def verifyRequiredElementEvidence(self, parsed: Any, sourceContent: str):
        return self.protocol.verify_required_element_evidence(parsed, sourceContent)

    def getCoreRegulatoryContext(self, targetMarkets: list[str], deviceCategory: str):
        return self.protocol.get_core_regulatory_context(targetMarkets, deviceCategory)

    def getSectionRequirements(self, sectionTitle: str):
        return self.protocol.get_section_requirements(sectionTitle)

    def getReportSectionInstructions(self, sectionTitle: str, sectionNumber: int):
        return self.report.get_section_instructions(sectionTitle, sectionNumber)

    def getReportSectionRelevantProtocol(self, sectionTitle: str, protocolSections: list[Any]):
        return self.report.get_section_relevant_protocol(sectionTitle, protocolSections)

    def getReportSectionAnalysisRequirements(self, sectionTitle: str):
        return self.report.get_section_analysis_requirements(sectionTitle)

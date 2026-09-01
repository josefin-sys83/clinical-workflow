from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class AnalyzeSynopsisRequest(BaseModel):
    text: str
    targetMarkets: list[str] = Field(default_factory=list)


class DeriveScopeRequest(BaseModel):
    text: str


class AnalyzeScopeRequest(BaseModel):
    clientPrompt: str


class GenerateProtocolSectionRequest(BaseModel):
    sectionTitle: str
    projectData: Any
    synopsis: str
    scope: Any
    additionalFixes: str | None = None


class GenerateProtocolRequest(BaseModel):
    projectData: Any
    roles: list[Any]
    synopsis: str
    scope: Any


class GenerateRequiredElementsRequest(BaseModel):
    sectionTitle: str
    targetMarkets: list[str]
    deviceCategory: str
    intendedUse: str


class AnalyzeSectionRequest(BaseModel):
    sectionTitle: str
    sectionContent: str
    targetMarkets: list[str]
    deviceCategory: str
    intendedUse: str
    requiredElements: list[Any] | None = None
    amendmentContext: Any | None = None
    crossSectionContext: list[Any] | None = None
    acceptedRequirements: str | None = None
    synopsisExcerpt: str | None = None


class GenerateReportSectionRequest(BaseModel):
    sectionTitle: Any
    sectionNumber: Any
    protocolSections: list[Any]
    synopsis: Any
    scope: Any
    projectData: Any
    roles: list[Any]
    existingReportSections: list[Any]


class AnalyzeReportSectionRequest(BaseModel):
    sectionTitle: str
    sectionContent: str
    targetMarkets: list[str]
    deviceCategory: str
    intendedUse: str
    appendicesList: list[Any] | None = None
    amendmentContext: Any | None = None


class ValidateStatisticalValuesRequest(BaseModel):
    sectionContent: str
    sectionTitle: str


class CheckStatisticalConsistencyRequest(BaseModel):
    statisticalMethodsContent: str
    resultsContent: str
    targetMarkets: list[str]


class CheckCrossConsistencyRequest(BaseModel):
    protocolSections: list[Any]
    reportSections: list[Any]
    targetMarkets: list[str]
    deviceCategory: str


class CheckSynopsisConsistencyRequest(BaseModel):
    synopsisText: str
    protocolSections: list[Any]

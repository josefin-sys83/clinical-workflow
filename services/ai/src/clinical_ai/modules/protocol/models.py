from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GenerateRequiredElementsRequest(BaseModel):
    sectionTitle: str
    targetMarkets: list[str]
    deviceCategory: str
    intendedUse: str


class RequiredElementInput(BaseModel):
    id: str | None = None
    name: str
    reference: str | None = None


class ProtocolSectionContext(BaseModel):
    title: str
    content: str


class AcceptedRequirement(BaseModel):
    name: str
    description: str = ''


class ProtocolAttachment(BaseModel):
    name: str
    content: str
    requirement: str | None = None


class PreviousAnalysisDecision(BaseModel):
    requirement: str | None = None
    severity: str
    issue: str
    decision: str
    reason: str | None = None


class AnalyzeSectionRequest(BaseModel):
    sectionTitle: str
    sectionContent: str
    targetMarkets: list[str]
    deviceCategory: str
    intendedUse: str
    requiredElements: list[RequiredElementInput] | None = None
    amendmentContext: Any | None = None
    crossSectionContext: list[ProtocolSectionContext] | None = None
    acceptedRequirements: list[AcceptedRequirement] | str | None = None
    synopsisExcerpt: str | None = None
    protocolAttachments: list[ProtocolAttachment] | None = None
    previousDecisions: list[PreviousAnalysisDecision] | None = None


class CheckProtocolAttachmentsRequest(BaseModel):
    issue: str
    requirement: str | None = None
    attachments: list[ProtocolAttachment] = Field(min_length=1)


ReviewSeverity = Literal[
    'blocker',
    'warning',
    'cross_reference',
    'recommendation',
    'human_decision_required',
]


class StrictProtocolModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)

    @field_validator('*', mode='before')
    @classmethod
    def reject_empty_strings(cls, value):
        if isinstance(value, str) and not value.strip():
            raise ValueError('string values must not be empty')
        return value


class GeneratedRequiredElement(StrictProtocolModel):
    id: str
    name: str
    reference: str
    status: Literal['missing']


class GenerateRequiredElementsResponse(StrictProtocolModel):
    requiredElements: list[GeneratedRequiredElement]


class RoutedRequirement(StrictProtocolModel):
    name: str
    relevance: Literal['relevant', 'maybe_relevant']


class RouteRequirementsResponse(StrictProtocolModel):
    requirements: list[RoutedRequirement]


class ProtocolIssueAnalysis(StrictProtocolModel):
    """Semantic issue returned by AI before application metadata is added."""

    severity: ReviewSeverity
    requirement: str | None
    subsection: str
    description: str
    source: str | None
    targetSection: str | None
    remediation: str | None
    textQuote: str | None


class RequiredElementBatchResult(StrictProtocolModel):
    name: str
    status: Literal['complete', 'partial', 'missing']
    evidence: str


class SatisfiedRequirement(StrictProtocolModel):
    name: str
    status: Literal['satisfied']
    source: Literal['section', 'attachment']
    sourceName: str | None
    evidence: str


class AnalyzeRequirementBatchResponse(StrictProtocolModel):
    """Structured results from requirement evaluation.

    - issues: requirement findings that still need action
    - satisfiedRequirements: accepted requirements that are satisfied
    - requiredElements: checklist results for required section elements"""

    issues: list[ProtocolIssueAnalysis]
    satisfiedRequirements: list[SatisfiedRequirement]
    requiredElements: list[RequiredElementBatchResult]


class CrossSectionResolution(StrictProtocolModel):
    issueNumber: int
    resolution: Literal['cross_reference', 'unchanged']
    targetSection: str | None
    description: str | None
    remediation: str | None


class CrossSectionNewFinding(ProtocolIssueAnalysis):
    severity: Literal['blocker', 'warning', 'cross_reference']


class ResolveCrossSectionResponse(StrictProtocolModel):
    resolutions: list[CrossSectionResolution]
    newFindings: list[CrossSectionNewFinding]


class AttachmentEvidence(StrictProtocolModel):
    document: str
    evidence: str


class AttachmentCheckResponse(StrictProtocolModel):
    outcome: Literal['resolves', 'partially_resolves', 'does_not_resolve']
    explanation: str
    sources: list[AttachmentEvidence]


class ProtocolReviewIssue(StrictProtocolModel):
    """Final API issue: AI semantics plus deterministic application metadata."""

    id: str
    severity: ReviewSeverity
    requirement: str | None
    subsection: str
    description: str
    source: str | None
    targetSection: str | None
    remediation: str | None
    raisedBy: Literal['AI Regulatory Review']
    raisedDate: str
    status: Literal['open']
    dueDate: Literal['7 days']
    textQuote: str | None


class ReviewedRequiredElement(StrictProtocolModel):
    id: str
    name: str
    reference: str
    status: Literal['complete', 'partial', 'missing']
    evidence: str


class AnalyzeSectionResponse(StrictProtocolModel):
    issues: list[ProtocolReviewIssue]
    requiredElements: list[ReviewedRequiredElement]
    satisfiedRequirements: list[SatisfiedRequirement]
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


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

    # @model_validator(mode='after')
    # def validate_required_element_count(self):
    #     if not 4 <= len(self.requiredElements) <= 6:
    #         raise ValueError('requiredElements must contain between 4 and 6 items')
    #     return self


class ProtocolReviewIssue(StrictProtocolModel):
    id: str
    severity: Literal[
        'blocker',
        'warning',
        'cross_reference',
        'recommendation',
        'human_decision_required',
    ]
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
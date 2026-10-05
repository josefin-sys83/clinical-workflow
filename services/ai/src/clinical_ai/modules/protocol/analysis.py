from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException

from clinical_ai.llm import LLMGateway
from clinical_ai.utils import get_value
from .models import (
    AnalyzeRequirementBatchResponse,
    AnalyzeSectionResponse,
    AttachmentCheckResponse,
    SatisfiedRequirement,
    ProtocolIssueAnalysis,
    ProtocolReviewIssue,
    ReviewSeverity,
    ResolveCrossSectionResponse,
    ReviewedRequiredElement,
    RouteRequirementsResponse,
)
from .prompts import (
    analyze_requirement_batch_prompt,
    check_attachments_against_finding_prompt,
    resolve_cross_section_findings_prompt,
    route_section_requirements_prompt,
)
from .rules import get_section_requirements


PROTOCOL_ATTACHMENT_TEXT_LIMIT = 32_000
PROTOCOL_REQUIREMENT_BATCH_CHAR_LIMIT = 40_000
PROTOCOL_REQUIREMENT_BATCH_MAX_ITEMS = 5

PROTOCOL_ISSUE_SEVERITY_RANK: dict[ReviewSeverity, int] = {
    "blocker": 0,
    "warning": 1,
    "cross_reference": 2,
    "human_decision_required": 3,
    "recommendation": 4,
}


@dataclass(frozen=True)
class ProtocolAnalysisContext:
    section_title: str
    section_content: str
    target_markets: list[str]
    device_category: str
    intended_use: str
    synopsis_excerpt: str | None
    amendment_context: dict[str, Any] | None
    attachments: list[dict[str, str]]
    decisions: list[dict[str, Any]]
    other_sections: list[dict[str, str]]


class ProtocolAnalysisService:
    """Protocol analysis orchestration."""

    def __init__(self, llm: LLMGateway):
        self.llm = llm

    @staticmethod
    def _key(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "")).strip().casefold()

    @classmethod
    def _accepted_requirements(cls, value: Any) -> list[dict[str, str]]:
        """Normalize legacy and typed API inputs once at the analysis boundary."""
        if value is None:
            return []

        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            try:
                parsed = json.loads(text)
            except (json.JSONDecodeError, TypeError):
                parsed = None
            value = (
                parsed
                if isinstance(parsed, list)
                else [line.strip(" -•\t") for line in text.splitlines() if line.strip(" -•\t")]
            )

        if not isinstance(value, list):
            return []

        result: list[dict[str, str]] = []
        seen: set[str] = set()
        for item in value:
            if isinstance(item, str):
                name, description = item.strip(), ""
            else:
                name = str(get_value(item, "name", "") or "").strip()
                description = str(get_value(item, "description", "") or "").strip()

            key = cls._key(name)
            if not key or key in seen:
                continue
            seen.add(key)
            result.append({"name": name, "description": description})
        return result

    @classmethod
    def _previous_decisions(cls, values: list[Any] | None) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for item in values or []:
            if str(get_value(item, "decision", "") or "").strip().upper() != "WONT_FIX":
                continue

            issue = str(get_value(item, "issue", "") or "").strip()
            severity = str(get_value(item, "severity", "") or "").strip().lower()
            if not issue or not severity:
                continue

            result.append(
                {
                    "requirement": str(get_value(item, "requirement", "") or "").strip() or None,
                    "severity": severity,
                    "issue": issue,
                    "decision": "WONT_FIX",
                    "reason": str(get_value(item, "reason", "") or "").strip() or None,
                }
            )
        return result

    @staticmethod
    def _validate_attachment_size(content: str) -> str:
        # TODO: Replace fixed attachment size rejection with retrieval/chunking (RAG)
        # so large attachments can be analyzed safely without truncating evidence.
        if len(content) > PROTOCOL_ATTACHMENT_TEXT_LIMIT:
            raise HTTPException(
                status_code=413,
                detail=f"Attachment exceeds the {PROTOCOL_ATTACHMENT_TEXT_LIMIT} character analysis limit.",
            )
        return content

    @classmethod
    def _attachments(
        cls,
        values: list[Any] | None,
        *,
        require_link: bool,
    ) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []
        for item in values or []:
            name = str(
                get_value(item, "name", "")
                or get_value(item, "title", "")
                or ""
            ).strip()
            content = str(get_value(item, "content", "") or "").strip()
            requirement = str(
                get_value(item, "requirement", "")
                or get_value(item, "requirementName", "")
                or ""
            ).strip()

            if not name or not content or (require_link and not requirement):
                continue

            result.append(
                {
                    "name": name,
                    "content": cls._validate_attachment_size(content),
                    "requirement": requirement,
                }
            )
        return result

    @staticmethod
    def _cross_sections(values: list[Any] | None) -> list[dict[str, str]]:
        result: list[dict[str, str]] = []
        for item in values or []:
            title = str(get_value(item, "title", "") or "").strip()
            content = str(get_value(item, "content", "") or "").strip()
            if title and content:
                result.append({"title": title, "content": content})
        return result

    def _prepare_context(
        self,
        section_title: str,
        section_content: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
        synopsis_excerpt: str | None,
        amendment_context: dict[str, Any] | None,
        protocol_attachments: list[Any] | None,
        previous_decisions: list[Any] | None,
        cross_section_context: list[Any] | None,
    ) -> ProtocolAnalysisContext:
        return ProtocolAnalysisContext(
            section_title=section_title,
            section_content=section_content,
            target_markets=target_markets,
            device_category=device_category,
            intended_use=intended_use,
            synopsis_excerpt=synopsis_excerpt,
            amendment_context=amendment_context,
            attachments=self._attachments(protocol_attachments, require_link=True),
            decisions=self._previous_decisions(previous_decisions),
            other_sections=self._cross_sections(cross_section_context),
        )

    @classmethod
    def _linked_documents(
        cls,
        requirement_names: list[str],
        attachments: list[dict[str, str]],
    ) -> list[dict[str, Any]]:
        names = {cls._key(name): name for name in requirement_names if cls._key(name)}
        grouped: dict[tuple[str, str], dict[str, Any]] = {}

        for attachment in attachments:
            requirement_name = names.get(cls._key(attachment["requirement"]))
            if not requirement_name:
                continue

            key = (attachment["name"], attachment["content"])
            grouped.setdefault(
                key,
                {
                    "name": attachment["name"],
                    "content": attachment["content"],
                    "requirements": [],
                },
            )["requirements"].append(requirement_name)

        return list(grouped.values())

    @classmethod
    def _batch_requirements(
        cls,
        requirements: list[dict[str, Any]],
        attachments: list[dict[str, str]],
    ) -> list[list[dict[str, Any]]]:
        batches: list[list[dict[str, Any]]] = []
        current: list[dict[str, Any]] = []
        current_size = 0

        for requirement in requirements:
            item_size = (
                len(str(requirement.get("name", "")))
                + len(str(requirement.get("description", "")))
                + 200
            )

            if requirement.get("kind") == "accepted_requirement":
                requirement_key = cls._key(requirement.get("name"))
                item_size += sum(
                    len(item["content"]) + len(item["name"]) + 100
                    for item in attachments
                    if cls._key(item["requirement"]) == requirement_key
                )

            if current and (
                len(current) >= PROTOCOL_REQUIREMENT_BATCH_MAX_ITEMS
                or current_size + item_size > PROTOCOL_REQUIREMENT_BATCH_CHAR_LIMIT
            ):
                batches.append(current)
                current = []
                current_size = 0

            current.append(requirement)
            current_size += item_size

        if current:
            batches.append(current)

        return batches

    @classmethod
    def _decisions_for_requirements(
        cls,
        requirement_names: list[str],
        decisions: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        keys = {cls._key(name) for name in requirement_names}
        return [
            decision
            for decision in decisions
            if not decision.get("requirement")
            or cls._key(decision.get("requirement")) in keys
        ]


    async def _route_requirements(
        self,
        context: ProtocolAnalysisContext,
        accepted_requirements: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        if not accepted_requirements:
            return []

        routed = await self.llm.complete_structured(
            route_section_requirements_prompt(
                context.section_title,
                context.section_content,
                context.synopsis_excerpt,
                context.amendment_context,
                accepted_requirements,
                context.decisions,
            ),
            response_model=RouteRequirementsResponse,
        )

        by_name = {self._key(item["name"]): item for item in accepted_requirements}
        selected: list[dict[str, str]] = []
        seen: set[str] = set()

        for item in routed.requirements:
            key = self._key(item.name)
            if key in by_name and key not in seen:
                seen.add(key)
                selected.append(by_name[key])

        return selected

    @staticmethod
    def _build_requirements(
        selected: list[dict[str, str]],
        required_elements: list[Any] | None,
        section_title: str,
    ) -> list[dict[str, Any]]:
        requirements: list[dict[str, Any]] = [
            {
                "kind": "accepted_requirement",
                "name": item["name"],
                "description": item["description"],
            }
            for item in selected
        ]

        requirements.extend(
            {
                "kind": "required_element",
                "name": str(get_value(item, "name", "") or "").strip(),
                "description": str(get_value(item, "reference", "") or "").strip(),
            }
            for item in (required_elements or [])
            if str(get_value(item, "name", "") or "").strip()
        )

        if not requirements:
            requirements.append(
                {
                    "kind": "required_element",
                    "name": "Section content requirements",
                    "description": get_section_requirements(section_title)["required"],
                }
            )

        return requirements

    async def _evaluate_batch(
        self,
        context: ProtocolAnalysisContext,
        batch: list[dict[str, Any]],
    ) -> AnalyzeRequirementBatchResponse:
        accepted_names = [
            item["name"]
            for item in batch
            if item.get("kind") == "accepted_requirement"
        ]

        return await self.llm.complete_structured(
            analyze_requirement_batch_prompt(
                context.section_title,
                context.section_content,
                context.target_markets,
                context.device_category,
                context.intended_use,
                context.synopsis_excerpt,
                context.amendment_context,
                batch,
                self._linked_documents(accepted_names, context.attachments),
                self._decisions_for_requirements(accepted_names, context.decisions),
            ),
            response_model=AnalyzeRequirementBatchResponse,
        )

    async def _evaluate_batches(
        self,
        context: ProtocolAnalysisContext,
        batches: list[list[dict[str, Any]]],
    ) -> list[AnalyzeRequirementBatchResponse]:

        return await asyncio.gather(
            *(self._evaluate_batch(context, batch) for batch in batches)
        )

    @classmethod
    def _merge_cross_section_findings(
        cls,
        issues: list[ProtocolIssueAnalysis],
        new_findings: list[ProtocolIssueAnalysis],
    ) -> list[ProtocolIssueAnalysis]:
        merged = list(issues)
        seen = {
            (
                cls._key(issue.requirement),
                cls._key(issue.description),
                cls._key(issue.targetSection),
            )
            for issue in issues
        }

        for finding in new_findings:
            key = (
                cls._key(finding.requirement),
                cls._key(finding.description),
                cls._key(finding.targetSection),
            )
            if key in seen:
                continue
            seen.add(key)
            merged.append(finding)

        return merged

    async def _resolve_cross_sections(
        self,
        context: ProtocolAnalysisContext,
        issues: list[ProtocolIssueAnalysis],
        batch_results: list[AnalyzeRequirementBatchResponse],
    ) -> list[ProtocolIssueAnalysis]:
        if not context.other_sections:
            return issues

        existing_findings = [
            {
                "issueNumber": index,
                **issue.model_dump(),
            }
            for index, issue in enumerate(issues, start=1)
        ]
        satisfied_requirements = [
            item.model_dump()
            for batch in batch_results
            for item in batch.satisfiedRequirements
        ]

        result = await self.llm.complete_structured(
            resolve_cross_section_findings_prompt(
                context.section_title,
                context.section_content,
                context.amendment_context,
                existing_findings,
                satisfied_requirements,
                context.other_sections,
                context.decisions,
            ),
            response_model=ResolveCrossSectionResponse,
        )

        resolutions = {item.issueNumber: item for item in result.resolutions}
        resolved = list(issues)

        for issue_number, issue_index in enumerate(range(len(resolved)), start=1):
            resolution = resolutions.get(issue_number)
            if not resolution or resolution.resolution == "unchanged":
                continue

            issue = resolved[issue_index]
            update: dict[str, Any] = {
                "severity": resolution.resolution,
                "targetSection": resolution.targetSection,
                "remediation": resolution.remediation,
            }
            if resolution.description:
                update["description"] = resolution.description

            resolved[issue_index] = issue.model_copy(update=update)

        return self._merge_cross_section_findings(resolved, result.newFindings)

    @staticmethod
    def _required_element_results(
        required_elements: list[Any],
        batch_results: list[AnalyzeRequirementBatchResponse],
    ) -> list[ReviewedRequiredElement]:
        reviewed = {
            re.sub(r"\s+", " ", item.name).strip().casefold(): item
            for batch in batch_results
            for item in batch.requiredElements
        }

        final: list[ReviewedRequiredElement] = []
        for index, element in enumerate(required_elements, start=1):
            name = str(get_value(element, "name", "") or "").strip()
            reference = (
                str(get_value(element, "reference", "") or "").strip()
                or "Section requirement"
            )
            element_id = (
                str(get_value(element, "id", "") or "").strip()
                or f"re-{index}"
            )
            result = reviewed.get(re.sub(r"\s+", " ", name).strip().casefold())

            final.append(
                ReviewedRequiredElement(
                    id=element_id,
                    name=name,
                    reference=reference,
                    status=result.status if result else "missing",
                    evidence=(
                        result.evidence
                        if result
                        else "The required element was not evaluated successfully."
                    ),
                )
            )

        return final

    @classmethod
    def _satisfied_requirements(
        cls,
        selected: list[dict[str, str]],
        batch_results: list[AnalyzeRequirementBatchResponse],
    ) -> list[SatisfiedRequirement]:

        reviewed = {
            cls._key(item.name): item
            for batch in batch_results
            for item in batch.satisfiedRequirements
        }

        final: list[SatisfiedRequirement] = []
        for requirement in selected:
            result = reviewed.get(cls._key(requirement["name"]))
            if result is None:
                continue

            final.append(
                SatisfiedRequirement(
                    name=requirement["name"],
                    status="satisfied",
                    source=result.source,
                    sourceName=result.sourceName,
                    evidence=result.evidence,
                )
            )

        return final

    @staticmethod
    def _build_review_issues(
        issues: list[ProtocolIssueAnalysis],
    ) -> list[ProtocolReviewIssue]:

        raised_date = datetime.now(timezone.utc).date().isoformat()
        ordered = sorted(
            issues,
            key=lambda issue: PROTOCOL_ISSUE_SEVERITY_RANK[issue.severity],
        )

        return [
            ProtocolReviewIssue(
                **issue.model_dump(exclude={"requirement"}),
                id=f"i-{index}",
                raisedBy="AI Regulatory Review",
                raisedDate=raised_date,
                status="open",
                dueDate="7 days",
            )
            for index, issue in enumerate(ordered, start=1)
        ]

    def _build_response(
        self,
        selected: list[dict[str, str]],
        required_elements: list[Any],
        batch_results: list[AnalyzeRequirementBatchResponse],
        issues: list[ProtocolIssueAnalysis],
    ) -> AnalyzeSectionResponse:
        return AnalyzeSectionResponse(
            issues=self._build_review_issues(issues),
            requiredElements=self._required_element_results(
                required_elements,
                batch_results,
            ),
            satisfiedRequirements=self._satisfied_requirements(
                selected,
                batch_results,
            ),
        )

    async def analyze_section(
        self,
        section_title: str,
        section_content: str,
        target_markets: list[str],
        device_category: str,
        intended_use: str,
        required_elements: list[Any] | None = None,
        amendment_context: dict[str, Any] | None = None,
        cross_section_context: list[Any] | None = None,
        accepted_requirements: Any = None,
        synopsis_excerpt: str | None = None,
        protocol_attachments: list[Any] | None = None,
        previous_decisions: list[Any] | None = None,
    ) -> Any:
        context = self._prepare_context(
            section_title,
            section_content,
            target_markets,
            device_category,
            intended_use,
            synopsis_excerpt,
            amendment_context,
            protocol_attachments,
            previous_decisions,
            cross_section_context,
        )
        accepted = self._accepted_requirements(accepted_requirements)
        selected = await self._route_requirements(context, accepted)

        requirements = self._build_requirements(
            selected,
            required_elements,
            section_title,
        )
        batches = self._batch_requirements(requirements, context.attachments)

        batch_results = await self._evaluate_batches(context, batches)

        issues = [issue for batch in batch_results for issue in batch.issues]
        issues = await self._resolve_cross_sections(context, issues, batch_results)

        return self._build_response(
            selected,
            required_elements or [],
            batch_results,
            issues,
        ).model_dump()

    async def check_attachments(
        self,
        issue: str,
        requirement: str | None,
        attachments: list[Any],
    ) -> Any:
        normalized = self._attachments(attachments, require_link=False)
        if not normalized:
            raise ValueError("at least one attachment with name and content is required")

        result = await self.llm.complete_structured(
            check_attachments_against_finding_prompt(
                issue,
                requirement,
                [
                    {"name": item["name"], "content": item["content"]}
                    for item in normalized
                ],
            ),
            response_model=AttachmentCheckResponse,
        )
        return result.model_dump()
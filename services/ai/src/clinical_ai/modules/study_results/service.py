from clinical_ai.errors import StructuredOutputException
from clinical_ai.llm import LLMGateway
from .models import ResultSuggestion, SuggestResultRequest
from .prompts import suggest_result_prompt


class ResultsService:
    """One source object -> one suggestion; no database writes or review decisions.

    prompts.py owns the writing rules; models.py owns the input/output contract.
    The backend supplies report destinations. The UI reviews and saves the result.
    TFL quotes establish source traceability, not proof of correct semantic matching.
    """

    def __init__(self, llm: LLMGateway):
        self.llm = llm

    async def suggest(self, request: SuggestResultRequest) -> ResultSuggestion:
        result = await self.llm.complete_structured(suggest_result_prompt(request), ResultSuggestion)
        available_keys = {section.key for section in request.sections}
        suggested_keys = [*result.alternativeSectionKeys]
        if result.reportSectionKey is not None:
            suggested_keys.append(result.reportSectionKey)
        if any(key not in available_keys for key in suggested_keys):
            raise StructuredOutputException("AI suggested a report section that is not available.")
        if request.tfl is None:
            result.tflEvidence = []
            return result
        documents = {document.id: document.text for document in request.tfl.documents}
        supported = (
            not request.tfl.limitation and result.reportSectionKey is not None
            and bool(result.tflEvidence)
            and all(evidence.documentId in documents and evidence.quote in documents[evidence.documentId]
                    for evidence in result.tflEvidence)
        )
        if not supported:
            result.limitation = request.tfl.limitation or (
                result.limitation if result.reportSectionKey is None else None
            ) or "The attached TFL does not provide a verifiable mapping for this entire result. Select a section manually."
            result.reportSectionKey = None
            result.alternativeSectionKeys = []
            result.tflEvidence = []
        return result

from clinical_ai.errors import StructuredOutputException
from clinical_ai.llm import LLMGateway
from .models import ResultSuggestion, SuggestResultRequest
from .prompts import suggest_result_prompt


class ResultsService:
    """One source object -> one suggestion; no database writes or review decisions.

    prompts.py owns the writing rules; models.py owns the input/output contract.
    The backend supplies report destinations. The UI reviews and saves the result.
    TFL mapping is deliberately not part of this task.
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
        return result

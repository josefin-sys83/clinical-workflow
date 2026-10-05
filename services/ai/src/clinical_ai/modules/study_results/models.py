from __future__ import annotations

import base64
import json
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ReportSectionOption(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    key: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=1000)


class SuggestResultRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["table", "figure", "listing"]
    content: dict[str, Any]
    sourceFilename: str = Field(min_length=1, max_length=1000)
    sourceLocation: str | None = Field(default=None, max_length=2000)
    originalReference: str | None = Field(default=None, max_length=1000)
    sections: list[ReportSectionOption]

    @model_validator(mode="after")
    def validate_source(self):
        image = self.content.get("image")
        if image is not None:
            if self.type != "figure" or not isinstance(image, dict):
                raise ValueError("Only figures may contain an embedded image.")
            url = image.get("dataUrl", "")
            if not isinstance(url, str) or len(url) > 14_000_000:
                raise ValueError("Figure image is too large or invalid.")
            match = re.fullmatch(r"data:image/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})", url)
            if not match:
                raise ValueError("Use an embedded PNG or JPEG, not an external image URL.")
            try:
                raw = base64.b64decode(match[2], validate=True)
            except ValueError as exc:
                raise ValueError("Invalid figure image encoding.") from exc
            valid = (raw.startswith(b"\x89PNG\r\n\x1a\n") if match[1] == "png"
                     else raw.startswith(b"\xff\xd8\xff") and raw.endswith(b"\xff\xd9"))
            if not valid or len(raw) > 10 * 1024 * 1024:
                raise ValueError("Use a valid PNG or JPEG up to 10 MB.")
        # Bound the complete textual model input; never silently truncate evidence.
        source = {k: v for k, v in self.content.items() if k not in ("image", "provenance")}
        payload = {**self.model_dump(exclude={"content"}), "content": source}
        if len(json.dumps(payload, ensure_ascii=False)) > 60_000:
            raise ValueError("Result is too large for AI suggestions. Split it or enter the fields manually.")
        if len({s.key for s in self.sections}) != len(self.sections):
            raise ValueError("Report section keys must be unique.")
        return self


class ResultSuggestion(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str | None = Field(max_length=1000)
    reportSectionKey: str | None = Field(max_length=200)
    description: str | None = Field(max_length=20000)
    limitation: str | None = Field(max_length=2000)
    alternativeSectionKeys: list[str]

    @model_validator(mode="after")
    def validate_fields(self):
        for value in (self.title, self.reportSectionKey, self.description, self.limitation):
            if value is not None and (not value or "\x00" in value):
                raise ValueError("Suggestion fields must be non-empty or null.")
        if any(v is None for v in (self.title, self.reportSectionKey, self.description)) and not self.limitation:
            raise ValueError("Incomplete suggestions must explain their limitation.")
        if self.alternativeSectionKeys:
            if (self.reportSectionKey is not None or self.title is None or self.description is None
                    or len(set(self.alternativeSectionKeys)) != len(self.alternativeSectionKeys)
                    or len(self.alternativeSectionKeys) < 2):
                raise ValueError("Mixed-topic alternatives require distinct sections, supported metadata and no selected section.")
        return self

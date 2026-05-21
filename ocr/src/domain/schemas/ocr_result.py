from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OcrPage(BaseModel):
    model_config = ConfigDict(frozen=True)

    page_number: int = Field(ge=1)
    text: str


class OcrResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    filename: str
    file_type: Literal["pdf", "image"]
    total_pages: int = Field(ge=1)
    pages: list[OcrPage]
    full_text: str

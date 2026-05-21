from __future__ import annotations

from typing import Protocol, runtime_checkable

from domain.schemas.ocr_result import OcrResult


@runtime_checkable
class OcrExtractorProtocol(Protocol):
    async def extract(self, content: bytes, filename: str) -> OcrResult: ...

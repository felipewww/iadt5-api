from __future__ import annotations

from domain.protocols.ocr_extractor import OcrExtractorProtocol
from domain.schemas.ocr_result import OcrResult
from utils.file_type import FileType, detect_file_type


class ExtractTextUseCase:
    def __init__(
        self,
        pdf_extractor: OcrExtractorProtocol,
        image_extractor: OcrExtractorProtocol,
    ) -> None:
        self._pdf_extractor = pdf_extractor
        self._image_extractor = image_extractor

    async def execute(self, content: bytes, filename: str) -> OcrResult:
        file_type = detect_file_type(content, filename)
        if file_type == FileType.PDF:
            return await self._pdf_extractor.extract(content, filename)
        return await self._image_extractor.extract(content, filename)


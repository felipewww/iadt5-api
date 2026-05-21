from __future__ import annotations

import io

import pytesseract
from PIL import Image

from domain.schemas.ocr_result import OcrPage, OcrResult


class ImageExtractor:
    async def extract(self, content: bytes, filename: str) -> OcrResult:
        image = Image.open(io.BytesIO(content))
        text: str = pytesseract.image_to_string(image)
        page = OcrPage(page_number=1, text=text)

        return OcrResult(
            filename=filename,
            file_type="image",
            total_pages=1,
            pages=[page],
            full_text=text,
        )

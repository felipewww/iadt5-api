from __future__ import annotations

import io

import pdfplumber

from domain.schemas.ocr_result import OcrPage, OcrResult


class PdfExtractor:
    async def extract(self, content: bytes, filename: str) -> OcrResult:
        pages: list[OcrPage] = []

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append(OcrPage(page_number=i, text=text))

        full_text = "\n\n".join(p.text for p in pages)

        return OcrResult(
            filename=filename,
            file_type="pdf",
            total_pages=len(pages) or 1,
            pages=pages,
            full_text=full_text,
        )

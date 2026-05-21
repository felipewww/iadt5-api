from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from application.use_cases.extract_text import ExtractTextUseCase
from domain.schemas.ocr_result import OcrResult
from infra.ocr.image_extractor import ImageExtractor
from infra.ocr.pdf_extractor import PdfExtractor

router = APIRouter(prefix="/ocr", tags=["ocr"])


def _get_use_case() -> ExtractTextUseCase:
    return ExtractTextUseCase(
        pdf_extractor=PdfExtractor(),
        image_extractor=ImageExtractor(),
    )


UseCaseDep = Annotated[ExtractTextUseCase, Depends(_get_use_case)]


@router.post("/extract", response_model=OcrResult)
async def extract(
    file: Annotated[UploadFile, File(description="PDF or image file to extract text from")],
    use_case: UseCaseDep,
) -> OcrResult:
    content = await file.read()
    filename = file.filename or "unknown"
    try:
        return await use_case.execute(content, filename)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

from __future__ import annotations

from enum import StrEnum

_PDF_MAGIC = b"%PDF"
_IMAGE_EXTENSIONS: frozenset[str] = frozenset({
    ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp",
})


class FileType(StrEnum):
    PDF = "pdf"
    IMAGE = "image"


def detect_file_type(content: bytes, filename: str) -> FileType:
    if content[:4] == _PDF_MAGIC:
        return FileType.PDF

    ext = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    if ext in _IMAGE_EXTENSIONS:
        return FileType.IMAGE

    raise ValueError(f"Unsupported file type for: {filename!r}")

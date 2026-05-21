from __future__ import annotations

import logging

import uvicorn

from infra.config import settings
from infra.http.app import app

__all__ = ["app"]

logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.APP_PORT,
        log_level=settings.LOG_LEVEL,
        reload=False,
    )

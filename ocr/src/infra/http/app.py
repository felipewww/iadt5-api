from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aio_pika
from fastapi import FastAPI

from infra.http.routers.ocr_router import router as ocr_router
from infra.rabbitmq.consumer import start_consumer

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    connection: aio_pika.RobustConnection | None = None
    try:
        connection = await start_consumer()
    except Exception:
        logger.exception("Failed to connect OCR consumer to RabbitMQ")
    yield
    if connection:
        await connection.close()


def create_app() -> FastAPI:
    app = FastAPI(title="OCR Service", version="1.0.0", lifespan=lifespan)

    app.include_router(ocr_router)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

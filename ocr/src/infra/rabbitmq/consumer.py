from __future__ import annotations

import json
import logging
from typing import Any

import aio_pika
import httpx

from application.use_cases.extract_text import ExtractTextUseCase
from infra.aws import s3
from infra.config import settings
from infra.ocr.image_extractor import ImageExtractor
from infra.ocr.pdf_extractor import PdfExtractor
from infra.rabbitmq.producer import publish_to_analyzer

logger = logging.getLogger(__name__)

EXCHANGE_NAME = f"{settings.TENANT_UID}_exc-ocr"
QUEUE_NAME = f"{settings.TENANT_UID}_queue-ocr"
DLX_NAME = f"{settings.TENANT_UID}_exc-dlx"


async def _patch_job(client: httpx.AsyncClient, job_id: str, body: dict[str, Any]) -> None:
    await client.patch(f"{settings.JOBS_SERVICE_URL}/jobs/{job_id}", json=body)


async def _add_step(client: httpx.AsyncClient, job_id: str, name: str, data: Any, status: int = 1) -> None:
    response = await client.post(
        f"{settings.JOBS_SERVICE_URL}/jobs/{job_id}/steps",
        json={"name": name, "data": data, "status": status},
    )
    response.raise_for_status()


def _make_message_handler(connection: aio_pika.RobustConnection):  # type: ignore[return]
    async def _process_message(message: aio_pika.IncomingMessage) -> None:
        async with message.process(requeue=True):
            envelope = json.loads(message.body)
            data: dict[str, Any] = envelope["data"]
            job_id: str = data["jobId"]
            project_id: int = data["projectId"]
            file_url: str = data["fileUrl"]
            file_name: str = data["fileName"]

            logger.info("[OCR] mensagem recebida | job=%s file=%s", job_id, file_name)

            async with httpx.AsyncClient(timeout=60) as client:
                await _patch_job(client, job_id, {"status": "RUNNING"})
                logger.info("[OCR] job marcado como RUNNING | job=%s", job_id)

                try:
                    logger.info("[OCR] baixando arquivo | job=%s", job_id)
                    response = await client.get(file_url)
                    response.raise_for_status()
                    content = response.content
                    logger.info("[OCR] arquivo baixado (%d bytes) | job=%s", len(content), job_id)

                    use_case = ExtractTextUseCase(
                        pdf_extractor=PdfExtractor(),
                        image_extractor=ImageExtractor(),
                    )

                    logger.info("[OCR] iniciando extração de texto | job=%s", job_id)
                    result = await use_case.execute(content, file_name)
                    logger.info(
                        "[OCR] extração concluída | job=%s pages=%d chars=%d",
                        job_id,
                        result.total_pages,
                        len(result.full_text),
                    )

                    ocr_key = f"projects/{project_id}/analysis/{job_id}_ocr.json"
                    s3.upload_bytes(result.model_dump_json().encode("utf-8"), ocr_key, "application/json")
                    ocr_result_url = s3.create_presigned_url(ocr_key)
                    logger.info("[OCR] resultado salvo no S3 | job=%s key=%s", job_id, ocr_key)

                    await _add_step(client, job_id, "ocr-extract", {
                        "file_type": result.file_type,
                        "total_pages": result.total_pages,
                        "chars": len(result.full_text),
                        "ocr_result_url": ocr_result_url,
                    })
                    logger.info("[OCR] step registrado no job | job=%s", job_id)

                    await publish_to_analyzer(connection, {
                        "jobId": job_id,
                        "projectId": project_id,
                        "fileUrl": file_url,
                        "fileName": file_name,
                        "ocrResultUrl": ocr_result_url,
                    })
                    logger.info("[OCR] mensagem publicada para o analyzer | job=%s", job_id)

                except Exception as exc:
                    logger.exception("[OCR] falha no processamento | job=%s erro=%s", job_id, exc)
                    await _patch_job(client, job_id, {"status": "FAILED", "error": str(exc)})
                    raise

    return _process_message


async def start_consumer() -> aio_pika.RobustConnection:
    url = f"amqp://{settings.RMQ_USER}:{settings.RMQ_PASS}@{settings.RMQ_HOST}"
    connection = await aio_pika.connect_robust(url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=1)

    exchange = await channel.declare_exchange(EXCHANGE_NAME, aio_pika.ExchangeType.FANOUT, durable=True)
    queue = await channel.declare_queue(
        QUEUE_NAME,
        durable=True,
        arguments={"x-dead-letter-exchange": DLX_NAME},
    )
    await queue.bind(exchange)
    await queue.consume(_make_message_handler(connection))

    logger.info("[OCR] consumer conectado | exchange=%s queue=%s", EXCHANGE_NAME, QUEUE_NAME)
    return connection

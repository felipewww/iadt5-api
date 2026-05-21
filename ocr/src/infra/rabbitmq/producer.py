from __future__ import annotations

import json
from typing import Any

import aio_pika

from infra.config import settings

ANALYZER_EXCHANGE_NAME = f"{settings.TENANT_UID}_exc-analyzer"


async def publish_to_analyzer(connection: aio_pika.RobustConnection, data: dict[str, Any]) -> None:
    channel = await connection.channel()
    exchange = await channel.declare_exchange(ANALYZER_EXCHANGE_NAME, aio_pika.ExchangeType.FANOUT, durable=True)

    envelope = {
        "tenant": {
            "id": 1,
            "schema": settings.TENANT_UID,
            "location": 1,
        },
        "data": data,
    }

    await exchange.publish(
        aio_pika.Message(
            body=json.dumps(envelope).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        ),
        routing_key="",
    )

    await channel.close()

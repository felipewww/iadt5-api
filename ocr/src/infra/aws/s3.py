from __future__ import annotations

import boto3
from botocore.config import Config

from infra.config import settings

THREE_DAYS_SECONDS = 60 * 60 * 24 * 3


def _client() -> boto3.client:  # type: ignore[valid-type]
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )


def upload_bytes(content: bytes, key: str, content_type: str = "text/plain") -> None:
    _client().put_object(
        Bucket=settings.AWS_BUCKET_NAME,
        Key=key,
        Body=content,
        ContentType=content_type,
    )


def create_presigned_url(key: str, expires_in: int = THREE_DAYS_SECONDS) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )

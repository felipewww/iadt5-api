from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_PORT: int = Field(default=3201)
    LOG_LEVEL: Literal["debug", "info", "warning", "error", "critical"] = Field(default="info")

    RMQ_USER: str = Field(default="guest")
    RMQ_PASS: str = Field(default="guest")
    RMQ_HOST: str = Field(default="platform-rabbitmq:5672")
    TENANT_UID: str = Field(default="_1_1")

    JOBS_SERVICE_URL: str = Field(default="http://platform-jobs:3100")

    AWS_ACCESS_KEY_ID: str = Field(default="")
    AWS_SECRET_ACCESS_KEY: str = Field(default="")
    AWS_REGION: str = Field(default="us-east-1")
    AWS_BUCKET_NAME: str = Field(default="")


settings = Settings()

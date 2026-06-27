"""Environment validation for OptiRoute ML service."""

from __future__ import annotations

import os
from pathlib import Path

from pydantic import BaseModel, Field, field_validator


BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"


class Settings(BaseModel):
    port: int = Field(default=8000, ge=1, le=65535)
    node_env: str = Field(default="development")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000"
    )
    max_request_bytes: int = Field(default=65536, ge=1024, le=1_048_576)
    model_path: str = Field(default="models/risk_model.pkl")
    backend_api_url: str = Field(default="http://localhost:5000/api")

    @field_validator("node_env")
    @classmethod
    def normalize_node_env(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("model_path")
    @classmethod
    def validate_model_path(cls, value: str) -> str:
        candidate = (BASE_DIR / value).resolve()
        models_root = MODELS_DIR.resolve()

        if models_root not in candidate.parents and candidate != models_root:
            raise ValueError("MODEL_PATH must resolve inside the models directory")

        if ".." in Path(value).parts:
            raise ValueError("MODEL_PATH must not contain path traversal segments")

        return value

    @property
    def is_production(self) -> bool:
        return self.node_env == "production"

    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def load_settings() -> Settings:
    return Settings(
        port=int(os.getenv("PORT", "8000")),
        node_env=os.getenv("NODE_ENV", os.getenv("ENV", "development")),
        cors_origins=os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000",
        ),
        max_request_bytes=int(os.getenv("MAX_REQUEST_BYTES", "65536")),
        model_path=os.getenv("MODEL_PATH", "models/risk_model.pkl"),
        backend_api_url=os.getenv("BACKEND_API_URL", "http://localhost:5000/api"),
    )


settings = load_settings()

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: str = Field(default="development")
    testing: bool = Field(default=False)

    supabase_url: str = Field(default="https://example.supabase.co")
    supabase_service_role_key: str = Field(default="mock-service-role-key")
    supabase_jwt_secret: str = Field(default="mock-jwt-secret-for-local-dev-only")

    anthropic_api_key: str = Field(default="mock-anthropic-key")

    redis_url: str = Field(default="redis://localhost:6379/0")

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

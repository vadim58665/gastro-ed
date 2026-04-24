from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

MOCK_PREFIXES = ("mock-", "test-")


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
    supabase_jwks_url: str | None = Field(default=None)

    anthropic_api_key: str = Field(default="mock-anthropic-key")

    redis_url: str = Field(default="redis://localhost:6379/0")

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod") and not self.testing

    @property
    def jwks_url(self) -> str:
        if self.supabase_jwks_url:
            return self.supabase_jwks_url
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    def validate_production_secrets(self) -> list[str]:
        """Возвращает список критичных secrets с мок-значениями в prod. Пустой = ок."""
        if not self.is_production():
            return []
        issues: list[str] = []
        if self.supabase_url.startswith("https://example"):
            issues.append("SUPABASE_URL is still default (example.supabase.co)")
        if any(self.supabase_service_role_key.startswith(p) for p in MOCK_PREFIXES):
            issues.append("SUPABASE_SERVICE_ROLE_KEY is a mock value")
        if any(self.supabase_jwt_secret.startswith(p) for p in MOCK_PREFIXES):
            issues.append("SUPABASE_JWT_SECRET is a mock value")
        if len(self.supabase_jwt_secret) < 32:
            issues.append("SUPABASE_JWT_SECRET is too short (<32 bytes)")
        return issues


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

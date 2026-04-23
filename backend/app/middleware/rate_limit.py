"""Rate limiting через slowapi с in-memory storage.

Для 100-1000 пользователей и single-instance Railway deployment достаточно
in-memory. При scale-out потребуется переход на Redis-storage.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.auth.jwt import bearer_scheme


def _key_by_user_then_ip(request: Request) -> str:
    """Ключ лимита: user_id из JWT если есть, иначе IP."""
    auth = request.headers.get("authorization") or ""
    if auth.startswith("Bearer "):
        # Простое хеширование токена без верификации подписи - цель лишь
        # стабильный ключ. Не используется для авторизации.
        return f"user:{hash(auth[7:]) & 0xFFFFFFFF}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_key_by_user_then_ip,
    storage_uri="memory://",
    default_limits=[],
)

# Слоты для разных типов endpoints (можно переиспользовать в декораторах роутов)
AI_ENQUEUE_LIMIT = "30/minute"
READINESS_LIMIT = "60/minute"
ANSWERS_BATCH_LIMIT = "60/minute"
ANALYTICS_LIMIT = "120/minute"

__all__ = [
    "AI_ENQUEUE_LIMIT",
    "ANALYTICS_LIMIT",
    "ANSWERS_BATCH_LIMIT",
    "READINESS_LIMIT",
    "bearer_scheme",
    "limiter",
]

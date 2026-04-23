"""Healthcheck endpoints: /health (liveness) и /health/ready (readiness)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Response, status

from app.config import get_settings

log = logging.getLogger("health")

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "gastroed-backend"}


@router.get("/health/ready")
async def readiness(response: Response) -> dict[str, object]:
    checks: dict[str, str] = {}
    all_ok = True

    # Supabase: лёгкий SELECT из системной таблицы
    try:
        from app.db.supabase_client import get_supabase

        supabase = get_supabase()
        supabase.table("prebuilt_content").select("entity_id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as exc:
        all_ok = False
        checks["supabase"] = f"error: {exc!r}"[:200]
        log.warning("supabase healthcheck failed: %s", exc)

    # Redis: PING
    try:
        from redis import Redis

        settings = get_settings()
        Redis.from_url(settings.redis_url, socket_timeout=2).ping()
        checks["redis"] = "ok"
    except Exception as exc:
        all_ok = False
        checks["redis"] = f"error: {exc!r}"[:200]
        log.warning("redis healthcheck failed: %s", exc)

    if not all_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ok" if all_ok else "degraded",
        "checks": checks,
    }

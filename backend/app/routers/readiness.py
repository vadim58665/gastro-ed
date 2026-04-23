"""API-роутер readiness: POST /api/readiness/compute.

Принимает снимок `questionStats` из клиента, считает `P(pass)` и возвращает
готовый отчёт. Не хранит данные (это делает Фаза 3, когда прогресс переедет
в Supabase таблицу `user_answers`).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.jwt import CurrentUser, get_current_user
from app.models.readiness import ComputeReadinessRequest, ReadinessReport
from app.services.readiness import compute_readiness

router = APIRouter(prefix="/api/readiness", tags=["readiness"])


@router.post("/compute", response_model=ReadinessReport)
async def compute(
    payload: ComputeReadinessRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> ReadinessReport:
    return compute_readiness(payload)

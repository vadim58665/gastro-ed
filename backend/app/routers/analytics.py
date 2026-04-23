"""Endpoints аналитики: mistakes, leaderboard, monthly stats."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.jwt import CurrentUser, get_current_user
from app.models.analytics import (
    LeaderboardResponse,
    MistakesResponse,
    MonthlyStatsResponse,
)
from app.services.analytics import (
    aggregate_mistakes,
    daily_case_leaderboard,
    monthly_stats,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@router.get("/mistakes", response_model=MistakesResponse)
async def mistakes(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    entity_type: Annotated[str | None, Query(pattern=r"^(card|accreditation_question)$")] = None,
    period_days: Annotated[int | None, Query(ge=1, le=365)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
) -> MistakesResponse:
    return aggregate_mistakes(
        user_id=user.user_id,
        entity_type=entity_type,
        period_days=period_days,
        limit=limit,
    )


@router.get("/leaderboard/daily-case", response_model=LeaderboardResponse)
async def leaderboard(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    case_date: Annotated[str, Query(description="YYYY-MM-DD")],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> LeaderboardResponse:
    if not DATE_RE.match(case_date):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="case_date must be YYYY-MM-DD",
        )
    return daily_case_leaderboard(case_date, limit=limit)


@router.get("/stats/monthly", response_model=MonthlyStatsResponse)
async def monthly(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    year: Annotated[int, Query(ge=2024, le=2100)],
    month: Annotated[int, Query(ge=1, le=12)],
) -> MonthlyStatsResponse:
    return monthly_stats(user_id=user.user_id, year=year, month=month)

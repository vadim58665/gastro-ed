"""Endpoints синхронизации прогресса."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.jwt import CurrentUser, get_current_user
from app.models.sync import (
    AnswersSinceResponse,
    BatchAnswersRequest,
    BatchAnswersResponse,
    FsrsSource,
    FsrsStateResponse,
)
from app.services.answers_store import (
    get_answers_since,
    get_fsrs_state,
    upsert_answers,
    upsert_fsrs_state,
)

router = APIRouter(tags=["sync"])


@router.post("/api/answers/batch", response_model=BatchAnswersResponse)
async def submit_batch(
    payload: BatchAnswersRequest,
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> BatchAnswersResponse:
    inserted, duplicates = upsert_answers(user.user_id, payload.answers)
    fsrs_count = upsert_fsrs_state(user.user_id, payload.fsrs_updates)
    return BatchAnswersResponse(
        answers_accepted=inserted,
        answers_duplicates=duplicates,
        fsrs_upserts=fsrs_count,
    )


@router.get("/api/fsrs/state", response_model=FsrsStateResponse)
async def fsrs_state(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    since: Annotated[int | None, Query(ge=0, description="Unix ms cutoff")] = None,
    source: Annotated[FsrsSource | None, Query()] = None,
) -> FsrsStateResponse:
    rows = get_fsrs_state(user.user_id, since_ms=since, source=source)
    return FsrsStateResponse(rows=rows, total=len(rows))


@router.get("/api/answers/since", response_model=AnswersSinceResponse)
async def answers_since(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    since: Annotated[int | None, Query(ge=0)] = None,
    limit: Annotated[int, Query(ge=1, le=1000)] = 1000,
) -> AnswersSinceResponse:
    rows = get_answers_since(user.user_id, since_ms=since, limit=limit)
    return AnswersSinceResponse(rows=rows, total=len(rows))

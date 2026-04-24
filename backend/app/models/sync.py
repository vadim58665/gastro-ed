"""Pydantic-модели синхронизации прогресса (user_answers + fsrs_state).

Клиент - master of FSRS math (считает в Web Worker). Backend хранит журнал
ответов и зеркало FSRS-состояния для синхронизации между устройствами.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class EntityType(StrEnum):
    CARD = "card"
    ACCREDITATION_QUESTION = "accreditation_question"


class AnswerSource(StrEnum):
    FEED = "feed"
    PREP = "prep"
    EXAM = "exam"
    BROWSE = "browse"


class FsrsSource(StrEnum):
    FEED = "feed"
    PREP = "prep"


class AnswerRecord(BaseModel):
    entity_type: EntityType
    entity_id: str = Field(..., min_length=1, max_length=128)
    is_correct: bool
    answered_at_ms: int = Field(..., gt=0)
    time_spent_ms: int | None = Field(default=None, ge=0)
    source: AnswerSource = AnswerSource.FEED
    idempotency_key: str = Field(..., min_length=1, max_length=128)


class FsrsStateDelta(BaseModel):
    entity_id: str = Field(..., min_length=1, max_length=128)
    source: FsrsSource = FsrsSource.FEED
    state: dict[str, Any] = Field(
        ..., description="FSRS-состояние как JSON: stability, difficulty, due, reps, lapses, ..."
    )
    updated_at_ms: int = Field(..., gt=0)


class BatchAnswersRequest(BaseModel):
    answers: list[AnswerRecord] = Field(default_factory=list, max_length=500)
    fsrs_updates: list[FsrsStateDelta] = Field(default_factory=list, max_length=500)


class BatchAnswersResponse(BaseModel):
    answers_accepted: int
    answers_duplicates: int
    fsrs_upserts: int


class FsrsStateRow(BaseModel):
    entity_id: str
    source: FsrsSource
    state: dict[str, Any]
    updated_at_ms: int


class FsrsStateResponse(BaseModel):
    rows: list[FsrsStateRow]
    total: int


class AnswerRow(BaseModel):
    entity_type: EntityType
    entity_id: str
    is_correct: bool
    answered_at_ms: int
    time_spent_ms: int | None
    source: AnswerSource


class AnswersSinceResponse(BaseModel):
    rows: list[AnswerRow]
    total: int

"""Pydantic-модели readiness-формулы (P(pass) для аккредитации).

Контракт 1:1 со спекой `docs/superpowers/specs/2026-04-20-readiness-formula-design.md`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

BlockLevel = Literal["not_started", "started", "weak", "ready", "strong"]


class QuestionStats(BaseModel):
    """Статистика по одному вопросу (совместима с localStorage-снимком из клиента)."""

    attempts: int = 0
    wrong: int = 0
    last_seen_ms: int = Field(default=0, description="Unix timestamp в миллисекундах")
    was_ever_correct: bool = False
    last_answer_correct: bool = False
    correct_streak: int = 0


class QuestionInput(BaseModel):
    question_id: str = Field(..., min_length=1)
    block_number: int = Field(..., ge=0)
    stats: QuestionStats | None = None


class ComputeReadinessRequest(BaseModel):
    specialty: str = Field(..., min_length=1)
    questions: list[QuestionInput] = Field(..., min_length=1, max_length=10_000)
    now_ms: int | None = Field(default=None, description="Для тестов/детерминизма")


class BlockReport(BaseModel):
    block_number: int
    level: BlockLevel
    average_strength: float
    coverage: float
    size: int
    weak_question_ids: list[str] = Field(default_factory=list)


class ReadinessReport(BaseModel):
    specialty: str
    total_questions: int
    exam_readiness: float  # 0..1, P(сдать >=70%)
    exam_readiness_percent: int  # округлённый процент
    coverage: float  # 0..1
    average_strength: float  # 0..1
    weak_count: int
    blocks_ready: int
    blocks: list[BlockReport] = Field(default_factory=list)
    computed_at_ms: int

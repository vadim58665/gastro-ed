from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

EntityTypeStr = Literal["card", "accreditation_question"]


class MistakeRow(BaseModel):
    entity_type: EntityTypeStr
    entity_id: str
    wrong_count: int
    total_attempts: int
    last_wrong_at_ms: int
    accuracy: float  # (total - wrong) / total


class MistakesResponse(BaseModel):
    rows: list[MistakeRow] = Field(default_factory=list)
    total: int
    period_ms: int | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    nickname: str | None
    total_points: int
    max_points: int
    completed_at_ms: int


class LeaderboardResponse(BaseModel):
    case_date: str
    rows: list[LeaderboardEntry] = Field(default_factory=list)
    total: int


class DailyStat(BaseModel):
    date: str  # YYYY-MM-DD
    correct: int
    wrong: int
    total: int
    accuracy: float


class MonthlyStatsResponse(BaseModel):
    year: int
    month: int
    days: list[DailyStat] = Field(default_factory=list)
    total_answers: int
    total_correct: int
    average_accuracy: float

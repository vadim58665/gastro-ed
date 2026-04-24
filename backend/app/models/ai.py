from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class ContentType(StrEnum):
    HINT = "hint"
    EXPLAIN_SHORT = "explain_short"
    EXPLAIN_LONG = "explain_long"


class EntityType(StrEnum):
    CARD = "card"
    ACCREDITATION_QUESTION = "accreditation_question"


class GenerationRequest(BaseModel):
    entity_type: EntityType
    entity_id: str = Field(..., min_length=1, max_length=128)
    content_type: ContentType
    prompt: str = Field(..., min_length=10, max_length=8000)


class GenerationResult(BaseModel):
    entity_type: EntityType
    entity_id: str
    content_type: ContentType
    content_ru: str
    model_used: str
    tokens_used: int
    cost_usd: float


class BatchEnqueueRequest(BaseModel):
    items: list[GenerationRequest] = Field(..., min_length=1, max_length=200)


class EnqueueResponse(BaseModel):
    job_id: str
    enqueued: int


class BatchStatus(BaseModel):
    job_id: str
    status: str
    total: int = 0
    completed: int = 0
    failed: int = 0
    cost_usd: float = 0.0

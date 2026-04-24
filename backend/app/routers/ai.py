"""API-роутер AI-pipeline: enqueue батча + проверка статуса задачи."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from rq import Queue
from rq.exceptions import NoSuchJobError
from rq.job import Job

from app.auth.jwt import CurrentUser, get_current_user
from app.config import Settings, get_settings
from app.models.ai import BatchEnqueueRequest, BatchStatus, EnqueueResponse

router = APIRouter(prefix="/api/ai", tags=["ai"])

AI_QUEUE = "ai"
BATCH_TIMEOUT = 1800  # 30 минут


@lru_cache(maxsize=1)
def _redis_client(redis_url: str) -> Redis:
    return Redis.from_url(redis_url)


def _queue(settings: Settings) -> Queue:
    return Queue(
        AI_QUEUE,
        connection=_redis_client(settings.redis_url),
        default_timeout=BATCH_TIMEOUT,
    )


@router.post("/enqueue", response_model=EnqueueResponse)
async def enqueue_batch(
    payload: BatchEnqueueRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> EnqueueResponse:
    queue = _queue(settings)
    job = queue.enqueue(
        "app.workers.ai_pipeline.generate_batch_job",
        [item.model_dump(mode="json") for item in payload.items],
        job_timeout=BATCH_TIMEOUT,
    )
    return EnqueueResponse(job_id=job.id, enqueued=len(payload.items))


@router.get("/status/{job_id}", response_model=BatchStatus)
async def job_status(
    job_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> BatchStatus:
    redis_conn = _redis_client(settings.redis_url)
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except NoSuchJobError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found",
        ) from exc

    result = job.result or {}
    return BatchStatus(
        job_id=job_id,
        status=job.get_status(),
        total=int(result.get("requested", 0)),
        completed=int(result.get("generated", 0)),
        failed=int(result.get("failed", 0)),
        cost_usd=float(result.get("cost_usd", 0.0)),
    )

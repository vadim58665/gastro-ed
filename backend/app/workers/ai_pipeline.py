"""RQ-задача для генерации подсказок/объяснений батчем.

`generate_batch_job` - entry point, вызываемый воркером. Принимает список
сериализованных GenerationRequest'ов, параллельно генерирует через Anthropic,
UPSERT'ит результаты в Supabase. Возвращает сводку для GET /api/ai/status.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict, dataclass, field

from app.models.ai import GenerationRequest, GenerationResult
from app.services.ai_client import AIClient
from app.services.prebuilt_store import upsert_results

log = logging.getLogger(__name__)


@dataclass
class BatchSummary:
    requested: int
    generated: int
    stored: int
    failed: int
    cost_usd: float
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


async def _run_batch(items: list[GenerationRequest]) -> tuple[list[GenerationResult], list[str]]:
    client = AIClient.create()
    tasks = [client.generate(item) for item in items]
    raw = await asyncio.gather(*tasks, return_exceptions=True)

    results: list[GenerationResult] = []
    errors: list[str] = []
    for item, outcome in zip(items, raw, strict=True):
        if isinstance(outcome, Exception):
            errors.append(f"{item.entity_type.value}/{item.entity_id}: {outcome!r}")
        else:
            results.append(outcome)
    return results, errors


def generate_batch_job(payload: list[dict]) -> dict:
    """RQ entry point. payload - уже сериализованный list[GenerationRequest]."""
    requests = [GenerationRequest.model_validate(item) for item in payload]
    log.info("batch start: %d items", len(requests))

    results, errors = asyncio.run(_run_batch(requests))
    stored = upsert_results(results) if results else 0
    cost = sum(r.cost_usd for r in results)

    summary = BatchSummary(
        requested=len(requests),
        generated=len(results),
        stored=stored,
        failed=len(errors),
        cost_usd=round(cost, 6),
        errors=errors[:20],
    )
    log.info("batch done: %s", summary)
    return summary.to_dict()

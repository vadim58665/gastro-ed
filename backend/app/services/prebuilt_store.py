"""UPSERT в таблицу `prebuilt_content` и чтение списка уже сгенерированных id."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from app.db.supabase_client import get_supabase
from app.models.ai import ContentType, EntityType, GenerationResult

TABLE = "prebuilt_content"
ON_CONFLICT = "entity_type,entity_id,content_type"
PAGE_SIZE = 1000


def _to_row(r: GenerationResult) -> dict:
    return {
        "entity_type": r.entity_type.value,
        "entity_id": r.entity_id,
        "content_type": r.content_type.value,
        "content_ru": r.content_ru,
        "model_used": r.model_used,
        "tokens_used": r.tokens_used,
        "cost_usd": r.cost_usd,
        "updated_at": datetime.now(UTC).isoformat(),
    }


def upsert_results(results: Iterable[GenerationResult]) -> int:
    rows = [_to_row(r) for r in results]
    if not rows:
        return 0
    supabase = get_supabase()
    response = supabase.table(TABLE).upsert(rows, on_conflict=ON_CONFLICT).execute()
    return len(response.data or [])


def list_existing_ids(entity_type: EntityType, content_type: ContentType) -> set[str]:
    supabase = get_supabase()
    seen: set[str] = set()
    offset = 0
    while True:
        response = (
            supabase.table(TABLE)
            .select("entity_id")
            .eq("entity_type", entity_type.value)
            .eq("content_type", content_type.value)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
        )
        data = response.data or []
        if not data:
            break
        for row in data:
            seen.add(row["entity_id"])
        if len(data) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return seen

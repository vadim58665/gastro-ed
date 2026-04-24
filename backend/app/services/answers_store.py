"""UPSERT в user_answers и fsrs_state + чтение истории и FSRS-state."""

from __future__ import annotations

from datetime import UTC, datetime

from app.db.supabase_client import get_supabase
from app.models.sync import (
    AnswerRecord,
    AnswerRow,
    AnswerSource,
    EntityType,
    FsrsSource,
    FsrsStateDelta,
    FsrsStateRow,
)

ANSWERS_TABLE = "user_answers"
FSRS_TABLE = "fsrs_state"
PAGE_SIZE = 1000


def _ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000.0, tz=UTC).isoformat()


def _iso_to_ms(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)


def upsert_answers(user_id: str, answers: list[AnswerRecord]) -> tuple[int, int]:
    """Возвращает (inserted, duplicates). UPSERT по (user_id, idempotency_key) с
    ignore_duplicates=True: повторные отправки не создают новых строк."""
    if not answers:
        return 0, 0

    supabase = get_supabase()
    rows = [
        {
            "user_id": user_id,
            "entity_type": a.entity_type.value,
            "entity_id": a.entity_id,
            "is_correct": a.is_correct,
            "answered_at": _ms_to_iso(a.answered_at_ms),
            "time_spent_ms": a.time_spent_ms,
            "source": a.source.value,
            "idempotency_key": a.idempotency_key,
        }
        for a in answers
    ]

    response = (
        supabase.table(ANSWERS_TABLE)
        .upsert(
            rows,
            on_conflict="user_id,idempotency_key",
            ignore_duplicates=True,
        )
        .execute()
    )
    inserted = len(response.data or [])
    duplicates = len(rows) - inserted
    return inserted, duplicates


def upsert_fsrs_state(user_id: str, updates: list[FsrsStateDelta]) -> int:
    if not updates:
        return 0

    supabase = get_supabase()
    rows = [
        {
            "user_id": user_id,
            "entity_id": u.entity_id,
            "source": u.source.value,
            "state": u.state,
            "updated_at": _ms_to_iso(u.updated_at_ms),
        }
        for u in updates
    ]

    response = (
        supabase.table(FSRS_TABLE).upsert(rows, on_conflict="user_id,entity_id,source").execute()
    )
    return len(response.data or [])


def get_fsrs_state(
    user_id: str,
    since_ms: int | None = None,
    source: FsrsSource | None = None,
) -> list[FsrsStateRow]:
    supabase = get_supabase()

    result: list[FsrsStateRow] = []
    offset = 0
    while True:
        query = (
            supabase.table(FSRS_TABLE)
            .select("entity_id,source,state,updated_at")
            .eq("user_id", user_id)
        )
        if since_ms is not None:
            query = query.gte("updated_at", _ms_to_iso(since_ms))
        if source is not None:
            query = query.eq("source", source.value)

        response = query.range(offset, offset + PAGE_SIZE - 1).execute()
        data = response.data or []
        if not data:
            break
        for row in data:
            result.append(
                FsrsStateRow(
                    entity_id=row["entity_id"],
                    source=FsrsSource(row["source"]),
                    state=row["state"],
                    updated_at_ms=_iso_to_ms(row["updated_at"]),
                )
            )
        if len(data) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return result


def get_answers_since(
    user_id: str,
    since_ms: int | None = None,
    limit: int = PAGE_SIZE,
) -> list[AnswerRow]:
    supabase = get_supabase()
    query = (
        supabase.table(ANSWERS_TABLE)
        .select("entity_type,entity_id,is_correct,answered_at,time_spent_ms,source")
        .eq("user_id", user_id)
        .order("answered_at", desc=True)
        .limit(limit)
    )
    if since_ms is not None:
        query = query.gte("answered_at", _ms_to_iso(since_ms))

    response = query.execute()
    data = response.data or []
    return [
        AnswerRow(
            entity_type=EntityType(row["entity_type"]),
            entity_id=row["entity_id"],
            is_correct=row["is_correct"],
            answered_at_ms=_iso_to_ms(row["answered_at"]),
            time_spent_ms=row.get("time_spent_ms"),
            source=AnswerSource(row["source"]),
        )
        for row in data
    ]

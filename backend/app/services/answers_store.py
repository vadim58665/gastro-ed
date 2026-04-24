"""UPSERT в user_answers и review_cards + чтение истории и FSRS-state.

Адаптировано под **существующую** схему БД:
- `user_answers` — уже существовала до Python-бэкенда (колонки id, user_id,
  card_id, is_correct, answered_at, error_type, error_explanation).
  Миграция 013 добавила entity_type, source, idempotency_key, time_spent_ms.
- `review_cards` — уже существовала как FSRS-зеркало (user_id, card_id,
  fsrs_state, due, last_review, updated_at). Используем её для FSRS sync
  вместо отдельной таблицы.

API-контракт (модели `app.models.sync`) сохраняем прежний — frontend не меняется.
Маппинг: `entity_id` (API) → `card_id` (БД). Для карточек это id карточки,
для аккредитационных вопросов — id вопроса (entity_type='accreditation_question').
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

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
FSRS_TABLE = "review_cards"
PAGE_SIZE = 1000


def _ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000.0, tz=UTC).isoformat()


def _iso_to_ms(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)


def _due_from_state(state: dict[str, Any], fallback_ms: int) -> str:
    """Достаём due из FSRS state. Клиент присылает его как ms или ISO."""
    raw = state.get("due")
    if isinstance(raw, (int, float)):
        return _ms_to_iso(int(raw))
    if isinstance(raw, str):
        try:
            return _ms_to_iso(_iso_to_ms(raw))
        except (ValueError, TypeError):
            pass
    return _ms_to_iso(fallback_ms)


def _last_review_from_state(state: dict[str, Any]) -> str | None:
    raw = state.get("last_review")
    if isinstance(raw, (int, float)):
        return _ms_to_iso(int(raw))
    if isinstance(raw, str):
        try:
            return _ms_to_iso(_iso_to_ms(raw))
        except (ValueError, TypeError):
            pass
    return None


def upsert_answers(user_id: str, answers: list[AnswerRecord]) -> tuple[int, int]:
    """Возвращает (inserted, duplicates). UPSERT по (user_id, idempotency_key)
    с ignore_duplicates=True: повторные отправки не создают новых строк.

    Маппинг: AnswerRecord.entity_id → БД колонка card_id.
    """
    if not answers:
        return 0, 0

    supabase = get_supabase()
    rows = [
        {
            "user_id": user_id,
            "card_id": a.entity_id,
            "entity_type": a.entity_type.value,
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
    """UPSERT в review_cards (user_id, card_id).

    FsrsSource.source не сохраняется в БД — review_cards не имеет такой
    колонки. Всё FSRS-состояние для `feed` хранится единообразно, `prep`
    (если понадобится) можно различать через state.source внутри jsonb.
    """
    if not updates:
        return 0

    supabase = get_supabase()
    rows = [
        {
            "user_id": user_id,
            "card_id": u.entity_id,
            "fsrs_state": {**u.state, "_source": u.source.value},
            "due": _due_from_state(u.state, u.updated_at_ms),
            "last_review": _last_review_from_state(u.state),
            "updated_at": _ms_to_iso(u.updated_at_ms),
        }
        for u in updates
    ]

    response = (
        supabase.table(FSRS_TABLE).upsert(rows, on_conflict="user_id,card_id").execute()
    )
    return len(response.data or [])


def get_fsrs_state(
    user_id: str,
    since_ms: int | None = None,
    source: FsrsSource | None = None,
) -> list[FsrsStateRow]:
    """Чтение FSRS-зеркала из review_cards.

    `source` filter применяется post-fetch, т.к. review_cards не имеет такой
    колонки — `_source` лежит внутри jsonb.
    """
    supabase = get_supabase()

    result: list[FsrsStateRow] = []
    offset = 0
    while True:
        query = (
            supabase.table(FSRS_TABLE)
            .select("card_id,fsrs_state,updated_at")
            .eq("user_id", user_id)
        )
        if since_ms is not None:
            query = query.gte("updated_at", _ms_to_iso(since_ms))

        response = query.range(offset, offset + PAGE_SIZE - 1).execute()
        data = response.data or []
        if not data:
            break
        for row in data:
            state = row.get("fsrs_state") or {}
            row_source_raw = state.pop("_source", "feed") if isinstance(state, dict) else "feed"
            try:
                row_source = FsrsSource(row_source_raw)
            except ValueError:
                row_source = FsrsSource.FEED
            if source is not None and row_source != source:
                continue
            result.append(
                FsrsStateRow(
                    entity_id=row["card_id"],
                    source=row_source,
                    state=state,
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
    """Чтение из user_answers. entity_type и source могут отсутствовать
    у старых записей - используем дефолты ('card'/'feed')."""
    supabase = get_supabase()
    query = (
        supabase.table(ANSWERS_TABLE)
        .select("card_id,entity_type,is_correct,answered_at,time_spent_ms,source")
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
            entity_type=EntityType(row.get("entity_type") or "card"),
            entity_id=row["card_id"],
            is_correct=row["is_correct"],
            answered_at_ms=_iso_to_ms(row["answered_at"]),
            time_spent_ms=row.get("time_spent_ms"),
            source=AnswerSource(row.get("source") or "feed"),
        )
        for row in data
    ]

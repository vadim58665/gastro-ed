"""Серверная аналитика: mistakes, leaderboard, monthly stats.

Принципиально: агрегацию делаем поверх user_answers (Фаза 3) и
daily_case_results (007 миграция). Для 100-1000 пользователей Python-агрегация
в памяти ок; когда вырастем, эти функции заменяются SQL RPC.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from app.db.supabase_client import get_supabase
from app.models.analytics import (
    DailyStat,
    LeaderboardEntry,
    LeaderboardResponse,
    MistakeRow,
    MistakesResponse,
    MonthlyStatsResponse,
)

PAGE_SIZE = 1000


def _iso_to_ms(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000)


def _ms_to_iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000.0, tz=UTC).isoformat()


def aggregate_mistakes(
    user_id: str,
    entity_type: str | None = None,
    period_days: int | None = None,
    limit: int = 100,
) -> MistakesResponse:
    supabase = get_supabase()
    query = (
        supabase.table("user_answers")
        .select("entity_type,entity_id,is_correct,answered_at")
        .eq("user_id", user_id)
    )
    cutoff_ms: int | None = None
    if period_days is not None and period_days > 0:
        cutoff = datetime.now(tz=UTC) - timedelta(days=period_days)
        cutoff_ms = int(cutoff.timestamp() * 1000)
        query = query.gte("answered_at", cutoff.isoformat())
    if entity_type is not None:
        query = query.eq("entity_type", entity_type)

    rows: list[dict] = []
    offset = 0
    while True:
        response = query.range(offset, offset + PAGE_SIZE - 1).execute()
        data = response.data or []
        if not data:
            break
        rows.extend(data)
        if len(data) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    # Агрегация в памяти: по (entity_type, entity_id)
    buckets: dict[tuple[str, str], dict] = defaultdict(
        lambda: {"wrong": 0, "total": 0, "last_wrong_iso": None}
    )
    for row in rows:
        key = (row["entity_type"], row["entity_id"])
        b = buckets[key]
        b["total"] += 1
        if not row["is_correct"]:
            b["wrong"] += 1
            ts = row["answered_at"]
            if b["last_wrong_iso"] is None or ts > b["last_wrong_iso"]:
                b["last_wrong_iso"] = ts

    result: list[MistakeRow] = []
    for (etype, eid), b in buckets.items():
        if b["wrong"] == 0:
            continue
        result.append(
            MistakeRow(
                entity_type=etype,
                entity_id=eid,
                wrong_count=b["wrong"],
                total_attempts=b["total"],
                last_wrong_at_ms=_iso_to_ms(b["last_wrong_iso"]) if b["last_wrong_iso"] else 0,
                accuracy=round((b["total"] - b["wrong"]) / b["total"], 4) if b["total"] else 0.0,
            )
        )

    result.sort(key=lambda r: (-r.wrong_count, -r.last_wrong_at_ms))
    result = result[:limit]

    return MistakesResponse(rows=result, total=len(result), period_ms=cutoff_ms)


def daily_case_leaderboard(case_date: str, limit: int = 50) -> LeaderboardResponse:
    supabase = get_supabase()
    response = (
        supabase.table("daily_case_results")
        .select("user_id,total_points,max_points,completed_at")
        .eq("case_date", case_date)
        .order("total_points", desc=True)
        .order("completed_at", desc=False)
        .limit(limit)
        .execute()
    )
    results = response.data or []
    if not results:
        return LeaderboardResponse(case_date=case_date, rows=[], total=0)

    user_ids = [r["user_id"] for r in results]
    profiles_response = (
        supabase.table("public_profiles").select("id,nickname").in_("id", user_ids).execute()
    )
    nicknames = {row["id"]: row["nickname"] for row in (profiles_response.data or [])}

    entries: list[LeaderboardEntry] = []
    for rank, row in enumerate(results, start=1):
        entries.append(
            LeaderboardEntry(
                rank=rank,
                user_id=row["user_id"],
                nickname=nicknames.get(row["user_id"]),
                total_points=int(row["total_points"]),
                max_points=int(row["max_points"]),
                completed_at_ms=_iso_to_ms(row["completed_at"]),
            )
        )
    return LeaderboardResponse(case_date=case_date, rows=entries, total=len(entries))


def monthly_stats(user_id: str, year: int, month: int) -> MonthlyStatsResponse:
    start = datetime(year, month, 1, tzinfo=UTC)
    next_month = (start + timedelta(days=32)).replace(day=1)

    supabase = get_supabase()
    response = (
        supabase.table("user_answers")
        .select("answered_at,is_correct")
        .eq("user_id", user_id)
        .gte("answered_at", start.isoformat())
        .lt("answered_at", next_month.isoformat())
        .limit(PAGE_SIZE * 10)
        .execute()
    )
    rows = response.data or []

    by_day: dict[date, dict] = defaultdict(lambda: {"correct": 0, "wrong": 0})
    for row in rows:
        d = datetime.fromisoformat(row["answered_at"].replace("Z", "+00:00")).date()
        if row["is_correct"]:
            by_day[d]["correct"] += 1
        else:
            by_day[d]["wrong"] += 1

    days: list[DailyStat] = []
    total_correct = 0
    total_answers = 0
    for d in sorted(by_day.keys()):
        c = by_day[d]["correct"]
        w = by_day[d]["wrong"]
        total = c + w
        total_answers += total
        total_correct += c
        days.append(
            DailyStat(
                date=d.isoformat(),
                correct=c,
                wrong=w,
                total=total,
                accuracy=round(c / total, 4) if total else 0.0,
            )
        )

    avg_acc = round(total_correct / total_answers, 4) if total_answers else 0.0

    return MonthlyStatsResponse(
        year=year,
        month=month,
        days=days,
        total_answers=total_answers,
        total_correct=total_correct,
        average_accuracy=avg_acc,
    )

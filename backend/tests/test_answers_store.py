from unittest.mock import MagicMock

from app.models.sync import (
    AnswerRecord,
    AnswerSource,
    EntityType,
    FsrsSource,
    FsrsStateDelta,
)
from app.services import answers_store

USER_ID = "11111111-1111-1111-1111-111111111111"


def _record(key: str, correct: bool = True) -> AnswerRecord:
    return AnswerRecord(
        entity_type=EntityType.CARD,
        entity_id="c1",
        is_correct=correct,
        answered_at_ms=1_700_000_000_000,
        time_spent_ms=5000,
        source=AnswerSource.FEED,
        idempotency_key=key,
    )


def _fsrs_delta(entity_id: str = "c1") -> FsrsStateDelta:
    return FsrsStateDelta(
        entity_id=entity_id,
        source=FsrsSource.FEED,
        state={"stability": 4.2, "difficulty": 5.1, "reps": 2, "lapses": 0, "state": 2},
        updated_at_ms=1_700_000_000_000,
    )


def _supabase_mock_for_upsert(inserted_rows):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    upsert = MagicMock()
    exec_result = MagicMock()
    exec_result.data = inserted_rows
    upsert.execute.return_value = exec_result
    table.upsert.return_value = upsert

    return sb


def test_upsert_answers_skips_on_empty(mocker):
    sb = MagicMock()
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    inserted, duplicates = answers_store.upsert_answers(USER_ID, [])

    assert inserted == 0
    assert duplicates == 0
    sb.table.assert_not_called()


def test_upsert_answers_counts_duplicates(mocker):
    # Клиент отправил 3, БД вернула 2 - значит 1 дубликат
    sb = _supabase_mock_for_upsert(inserted_rows=[{"id": 1}, {"id": 2}])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    records = [_record("k1"), _record("k2"), _record("k3")]
    inserted, duplicates = answers_store.upsert_answers(USER_ID, records)

    assert inserted == 2
    assert duplicates == 1

    upsert_args = sb.table.return_value.upsert.call_args
    sent_rows = upsert_args.args[0]
    assert len(sent_rows) == 3
    assert all(r["user_id"] == USER_ID for r in sent_rows)
    assert upsert_args.kwargs["on_conflict"] == "user_id,idempotency_key"
    assert upsert_args.kwargs["ignore_duplicates"] is True


def test_upsert_answers_serializes_timestamp(mocker):
    sb = _supabase_mock_for_upsert(inserted_rows=[{"id": 1}])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    answers_store.upsert_answers(USER_ID, [_record("k")])

    row = sb.table.return_value.upsert.call_args.args[0][0]
    assert row["answered_at"].startswith("2023-11-14T22:13:20")


def test_upsert_fsrs_state(mocker):
    sb = _supabase_mock_for_upsert(inserted_rows=[{"id": 1}, {"id": 2}])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    count = answers_store.upsert_fsrs_state(
        USER_ID,
        [_fsrs_delta("c1"), _fsrs_delta("c2")],
    )
    assert count == 2

    args = sb.table.return_value.upsert.call_args
    rows = args.args[0]
    assert rows[0]["state"]["stability"] == 4.2
    assert args.kwargs["on_conflict"] == "user_id,entity_id,source"


def test_upsert_fsrs_state_empty(mocker):
    sb = MagicMock()
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)
    assert answers_store.upsert_fsrs_state(USER_ID, []) == 0
    sb.table.assert_not_called()


def _supabase_mock_for_get(pages: list[list[dict]]):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    select_builder = MagicMock()
    table.select.return_value = select_builder
    select_builder.eq.return_value = select_builder
    select_builder.gte.return_value = select_builder
    select_builder.order.return_value = select_builder
    select_builder.limit.return_value = select_builder

    range_builder = MagicMock()
    select_builder.range.return_value = range_builder

    pages_iter = iter(pages)

    def side_effect():
        resp = MagicMock()
        try:
            resp.data = next(pages_iter)
        except StopIteration:
            resp.data = []
        return resp

    range_builder.execute.side_effect = side_effect
    select_builder.execute.side_effect = side_effect

    return sb


def test_get_fsrs_state_filters_by_user_and_since(mocker):
    page = [
        {
            "entity_id": "c1",
            "source": "feed",
            "state": {"stability": 4.2, "difficulty": 5.1},
            "updated_at": "2023-11-14T22:13:20+00:00",
        },
    ]
    sb = _supabase_mock_for_get([page])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    rows = answers_store.get_fsrs_state(USER_ID, since_ms=1_600_000_000_000)

    assert len(rows) == 1
    assert rows[0].entity_id == "c1"
    assert rows[0].updated_at_ms == 1_700_000_000_000

    sb.table.return_value.select.return_value.eq.assert_any_call("user_id", USER_ID)


def test_get_fsrs_state_empty(mocker):
    sb = _supabase_mock_for_get([[]])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    rows = answers_store.get_fsrs_state(USER_ID)
    assert rows == []


def test_get_answers_since_limits_and_orders(mocker):
    page = [
        {
            "entity_type": "card",
            "entity_id": "c1",
            "is_correct": True,
            "answered_at": "2023-11-14T22:13:20+00:00",
            "time_spent_ms": 4000,
            "source": "feed",
        },
    ]
    sb = _supabase_mock_for_get([page])
    mocker.patch.object(answers_store, "get_supabase", return_value=sb)

    rows = answers_store.get_answers_since(USER_ID, since_ms=None, limit=100)

    assert len(rows) == 1
    assert rows[0].entity_id == "c1"
    assert rows[0].is_correct is True

    sb.table.return_value.select.return_value.order.assert_called_with("answered_at", desc=True)

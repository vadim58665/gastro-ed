from unittest.mock import MagicMock

from app.services import analytics

USER_ID = "u-1"


def _supabase_for_pages(pages: list[list[dict]]):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    builder = MagicMock()
    table.select.return_value = builder
    builder.eq.return_value = builder
    builder.gte.return_value = builder
    builder.lt.return_value = builder
    builder.in_.return_value = builder
    builder.order.return_value = builder
    builder.limit.return_value = builder

    range_builder = MagicMock()
    builder.range.return_value = range_builder

    pages_iter = iter(pages)

    def exec_side_effect():
        resp = MagicMock()
        try:
            resp.data = next(pages_iter)
        except StopIteration:
            resp.data = []
        return resp

    range_builder.execute.side_effect = exec_side_effect
    builder.execute.side_effect = exec_side_effect

    return sb


# ---------- aggregate_mistakes ----------


def test_aggregate_mistakes_groups_and_sorts(mocker):
    rows = [
        {
            "entity_type": "card",
            "entity_id": "c1",
            "is_correct": False,
            "answered_at": "2026-04-01T10:00:00+00:00",
        },
        {
            "entity_type": "card",
            "entity_id": "c1",
            "is_correct": False,
            "answered_at": "2026-04-05T10:00:00+00:00",
        },
        {
            "entity_type": "card",
            "entity_id": "c1",
            "is_correct": True,
            "answered_at": "2026-04-10T10:00:00+00:00",
        },
        {
            "entity_type": "card",
            "entity_id": "c2",
            "is_correct": False,
            "answered_at": "2026-04-08T10:00:00+00:00",
        },
        {
            "entity_type": "card",
            "entity_id": "c3",
            "is_correct": True,
            "answered_at": "2026-04-09T10:00:00+00:00",
        },
    ]
    sb = _supabase_for_pages([rows])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.aggregate_mistakes(user_id=USER_ID, limit=10)

    assert resp.total == 2
    assert resp.rows[0].entity_id == "c1"
    assert resp.rows[0].wrong_count == 2
    assert resp.rows[0].total_attempts == 3
    assert abs(resp.rows[0].accuracy - (1 / 3)) < 1e-3

    assert resp.rows[1].entity_id == "c2"
    assert resp.rows[1].accuracy == 0.0

    c3_ids = [r.entity_id for r in resp.rows]
    assert "c3" not in c3_ids


def test_aggregate_mistakes_no_data(mocker):
    sb = _supabase_for_pages([[]])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.aggregate_mistakes(user_id=USER_ID)
    assert resp.total == 0
    assert resp.rows == []


def test_aggregate_mistakes_filters_entity_type(mocker):
    sb = _supabase_for_pages([[]])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    analytics.aggregate_mistakes(user_id=USER_ID, entity_type="accreditation_question")

    eq_calls = sb.table.return_value.select.return_value.eq.call_args_list
    eq_values = {c.args for c in eq_calls}
    assert ("user_id", USER_ID) in eq_values
    assert ("entity_type", "accreditation_question") in eq_values


def test_aggregate_mistakes_limit_truncates(mocker):
    # 10 разных вопросов с разным wrong_count
    rows = [
        {
            "entity_type": "card",
            "entity_id": f"q{i}",
            "is_correct": False,
            "answered_at": "2026-04-10T10:00:00+00:00",
        }
        for i in range(10)
    ]
    sb = _supabase_for_pages([rows])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.aggregate_mistakes(user_id=USER_ID, limit=3)
    assert len(resp.rows) == 3
    assert resp.total == 3


# ---------- daily_case_leaderboard ----------


def test_leaderboard_joins_nicknames(mocker):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    leaderboard_builder = MagicMock()
    leaderboard_builder.eq.return_value = leaderboard_builder
    leaderboard_builder.order.return_value = leaderboard_builder
    leaderboard_builder.limit.return_value = leaderboard_builder
    leaderboard_builder.execute.return_value.data = [
        {
            "user_id": "u1",
            "total_points": 10,
            "max_points": 10,
            "completed_at": "2026-04-20T10:00:00+00:00",
        },
        {
            "user_id": "u2",
            "total_points": 8,
            "max_points": 10,
            "completed_at": "2026-04-20T10:30:00+00:00",
        },
    ]

    profiles_builder = MagicMock()
    profiles_builder.in_.return_value = profiles_builder
    profiles_builder.execute.return_value.data = [
        {"id": "u1", "nickname": "alice"},
        {"id": "u2", "nickname": "bob"},
    ]

    table.select.side_effect = [leaderboard_builder, profiles_builder]

    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.daily_case_leaderboard("2026-04-20")

    assert resp.total == 2
    assert resp.rows[0].rank == 1
    assert resp.rows[0].nickname == "alice"
    assert resp.rows[0].total_points == 10
    assert resp.rows[1].rank == 2
    assert resp.rows[1].nickname == "bob"


def test_leaderboard_empty_day(mocker):
    sb = MagicMock()
    table = MagicMock()
    sb.table.return_value = table

    builder = MagicMock()
    builder.eq.return_value = builder
    builder.order.return_value = builder
    builder.limit.return_value = builder
    builder.execute.return_value.data = []
    table.select.return_value = builder

    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.daily_case_leaderboard("2026-04-20")
    assert resp.total == 0
    assert resp.rows == []


# ---------- monthly_stats ----------


def test_monthly_stats_groups_by_day(mocker):
    rows = [
        {"answered_at": "2026-04-01T10:00:00+00:00", "is_correct": True},
        {"answered_at": "2026-04-01T15:00:00+00:00", "is_correct": False},
        {"answered_at": "2026-04-02T09:00:00+00:00", "is_correct": True},
        {"answered_at": "2026-04-02T11:00:00+00:00", "is_correct": True},
    ]
    sb = _supabase_for_pages([rows])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.monthly_stats(user_id=USER_ID, year=2026, month=4)

    assert resp.total_answers == 4
    assert resp.total_correct == 3
    assert abs(resp.average_accuracy - 0.75) < 1e-3
    assert len(resp.days) == 2
    day1 = resp.days[0]
    assert day1.date == "2026-04-01"
    assert day1.correct == 1
    assert day1.wrong == 1
    assert abs(day1.accuracy - 0.5) < 1e-3


def test_monthly_stats_empty(mocker):
    sb = _supabase_for_pages([[]])
    mocker.patch.object(analytics, "get_supabase", return_value=sb)

    resp = analytics.monthly_stats(user_id=USER_ID, year=2026, month=4)
    assert resp.total_answers == 0
    assert resp.average_accuracy == 0.0
    assert resp.days == []

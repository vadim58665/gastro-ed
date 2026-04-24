from app.models.analytics import (
    DailyStat,
    LeaderboardEntry,
    LeaderboardResponse,
    MistakeRow,
    MistakesResponse,
    MonthlyStatsResponse,
)

# ---------- mistakes ----------


def test_mistakes_requires_auth(client):
    response = client.get("/api/analytics/mistakes")
    assert response.status_code == 401


def test_mistakes_returns_aggregated(client, valid_token_factory, mocker):
    mocker.patch(
        "app.routers.analytics.aggregate_mistakes",
        return_value=MistakesResponse(
            rows=[
                MistakeRow(
                    entity_type="card",
                    entity_id="c1",
                    wrong_count=3,
                    total_attempts=5,
                    last_wrong_at_ms=1_700_000_000_000,
                    accuracy=0.4,
                )
            ],
            total=1,
            period_ms=None,
        ),
    )
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/mistakes?period_days=30&limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["rows"][0]["entity_id"] == "c1"


def test_mistakes_validates_entity_type(client, valid_token_factory):
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/mistakes?entity_type=nonsense",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


# ---------- leaderboard ----------


def test_leaderboard_requires_auth(client):
    response = client.get("/api/analytics/leaderboard/daily-case?case_date=2026-04-20")
    assert response.status_code == 401


def test_leaderboard_rejects_bad_date(client, valid_token_factory):
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/leaderboard/daily-case?case_date=not-a-date",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_leaderboard_returns_rows(client, valid_token_factory, mocker):
    mocker.patch(
        "app.routers.analytics.daily_case_leaderboard",
        return_value=LeaderboardResponse(
            case_date="2026-04-20",
            rows=[
                LeaderboardEntry(
                    rank=1,
                    user_id="u1",
                    nickname="alice",
                    total_points=10,
                    max_points=10,
                    completed_at_ms=1_700_000_000_000,
                )
            ],
            total=1,
        ),
    )
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/leaderboard/daily-case?case_date=2026-04-20",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["case_date"] == "2026-04-20"
    assert body["rows"][0]["nickname"] == "alice"


# ---------- monthly ----------


def test_monthly_requires_auth(client):
    response = client.get("/api/analytics/stats/monthly?year=2026&month=4")
    assert response.status_code == 401


def test_monthly_validates_range(client, valid_token_factory):
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/stats/monthly?year=2026&month=13",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_monthly_returns_stats(client, valid_token_factory, mocker):
    mocker.patch(
        "app.routers.analytics.monthly_stats",
        return_value=MonthlyStatsResponse(
            year=2026,
            month=4,
            days=[DailyStat(date="2026-04-01", correct=5, wrong=1, total=6, accuracy=0.833)],
            total_answers=6,
            total_correct=5,
            average_accuracy=0.833,
        ),
    )
    token = valid_token_factory()
    response = client.get(
        "/api/analytics/stats/monthly?year=2026&month=4",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["year"] == 2026
    assert body["total_correct"] == 5
    assert len(body["days"]) == 1

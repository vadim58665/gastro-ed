from app.models.sync import FsrsSource, FsrsStateRow


def _batch_payload() -> dict:
    return {
        "answers": [
            {
                "entity_type": "card",
                "entity_id": "c1",
                "is_correct": True,
                "answered_at_ms": 1_700_000_000_000,
                "time_spent_ms": 5000,
                "source": "feed",
                "idempotency_key": "client-1",
            },
            {
                "entity_type": "accreditation_question",
                "entity_id": "aq-42",
                "is_correct": False,
                "answered_at_ms": 1_700_000_100_000,
                "source": "prep",
                "idempotency_key": "client-2",
            },
        ],
        "fsrs_updates": [
            {
                "entity_id": "c1",
                "source": "feed",
                "state": {"stability": 3.1, "difficulty": 5.0, "reps": 1, "lapses": 0},
                "updated_at_ms": 1_700_000_000_000,
            }
        ],
    }


def test_batch_requires_auth(client):
    response = client.post("/api/answers/batch", json=_batch_payload())
    assert response.status_code == 401


def test_batch_upserts_and_reports_counts(client, valid_token_factory, mocker):
    upsert_answers = mocker.patch("app.routers.answers.upsert_answers", return_value=(2, 0))
    upsert_fsrs = mocker.patch("app.routers.answers.upsert_fsrs_state", return_value=1)

    token = valid_token_factory(user_id="u-123")
    response = client.post(
        "/api/answers/batch",
        json=_batch_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["answers_accepted"] == 2
    assert body["answers_duplicates"] == 0
    assert body["fsrs_upserts"] == 1

    # Проверяем что uid пробрасывается
    upsert_answers.assert_called_once()
    assert upsert_answers.call_args.args[0] == "u-123"
    upsert_fsrs.assert_called_once()
    assert upsert_fsrs.call_args.args[0] == "u-123"


def test_batch_accepts_empty_lists(client, valid_token_factory, mocker):
    mocker.patch("app.routers.answers.upsert_answers", return_value=(0, 0))
    mocker.patch("app.routers.answers.upsert_fsrs_state", return_value=0)

    token = valid_token_factory()
    response = client.post(
        "/api/answers/batch",
        json={"answers": [], "fsrs_updates": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200


def test_batch_rejects_oversized_payload(client, valid_token_factory):
    token = valid_token_factory()
    payload = {
        "answers": [
            {
                "entity_type": "card",
                "entity_id": f"c{i}",
                "is_correct": True,
                "answered_at_ms": 1_700_000_000_000 + i,
                "idempotency_key": f"k-{i}",
            }
            for i in range(501)  # лимит 500
        ],
        "fsrs_updates": [],
    }
    response = client.post(
        "/api/answers/batch",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_fsrs_state_requires_auth(client):
    response = client.get("/api/fsrs/state")
    assert response.status_code == 401


def test_fsrs_state_passes_filters(client, valid_token_factory, mocker):
    mock = mocker.patch(
        "app.routers.answers.get_fsrs_state",
        return_value=[
            FsrsStateRow(
                entity_id="c1",
                source=FsrsSource.FEED,
                state={"stability": 4.0},
                updated_at_ms=1_700_000_000_000,
            )
        ],
    )
    token = valid_token_factory(user_id="u-42")

    response = client.get(
        "/api/fsrs/state?since=1600000000000&source=feed",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["rows"][0]["entity_id"] == "c1"

    mock.assert_called_once_with("u-42", since_ms=1600000000000, source=FsrsSource.FEED)


def test_answers_since_requires_auth(client):
    response = client.get("/api/answers/since")
    assert response.status_code == 401


def test_answers_since_returns_rows(client, valid_token_factory, mocker):
    from app.models.sync import AnswerRow

    mocker.patch(
        "app.routers.answers.get_answers_since",
        return_value=[
            AnswerRow(
                entity_type="card",
                entity_id="c1",
                is_correct=True,
                answered_at_ms=1_700_000_000_000,
                time_spent_ms=3000,
                source="feed",
            )
        ],
    )
    token = valid_token_factory()
    response = client.get(
        "/api/answers/since?limit=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["rows"][0]["entity_id"] == "c1"

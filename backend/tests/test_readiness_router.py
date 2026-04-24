from app.models.readiness import (
    ComputeReadinessRequest,
    QuestionInput,
    QuestionStats,
)


def _payload() -> dict:
    stats = QuestionStats(
        attempts=3,
        wrong=0,
        last_seen_ms=1_700_000_000_000,
        was_ever_correct=True,
        last_answer_correct=True,
        correct_streak=3,
    )
    req = ComputeReadinessRequest(
        specialty="gastroenterologiya",
        questions=[
            QuestionInput(question_id="q1", block_number=1, stats=stats),
            QuestionInput(question_id="q2", block_number=1, stats=None),
            QuestionInput(question_id="q3", block_number=2, stats=stats),
        ],
        now_ms=1_700_000_500_000,
    )
    return req.model_dump(mode="json")


def test_compute_requires_auth(client):
    response = client.post("/api/readiness/compute", json=_payload())
    assert response.status_code == 401


def test_compute_returns_report(client, valid_token_factory):
    token = valid_token_factory()
    response = client.post(
        "/api/readiness/compute",
        json=_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["specialty"] == "gastroenterologiya"
    assert body["total_questions"] == 3
    assert 0.0 <= body["exam_readiness"] <= 1.0
    assert 0 <= body["exam_readiness_percent"] <= 100
    assert len(body["blocks"]) == 2
    assert {b["block_number"] for b in body["blocks"]} == {1, 2}


def test_compute_rejects_empty_questions(client, valid_token_factory):
    token = valid_token_factory()
    response = client.post(
        "/api/readiness/compute",
        json={"specialty": "X", "questions": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_compute_accepts_up_to_limit(client, valid_token_factory):
    token = valid_token_factory()
    payload = {
        "specialty": "X",
        "questions": [
            {"question_id": f"q{i}", "block_number": (i % 5) + 1, "stats": None} for i in range(500)
        ],
        "now_ms": 1_700_000_000_000,
    }
    response = client.post(
        "/api/readiness/compute",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total_questions"] == 500
    assert len(body["blocks"]) == 5

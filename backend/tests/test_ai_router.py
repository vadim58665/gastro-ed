from unittest.mock import MagicMock

from rq.exceptions import NoSuchJobError


def _payload(n: int = 1) -> dict:
    return {
        "items": [
            {
                "entity_type": "card",
                "entity_id": f"c{i}",
                "content_type": "hint",
                "prompt": "достаточно длинный промпт для валидации длины",
            }
            for i in range(n)
        ]
    }


def test_enqueue_requires_auth(client):
    response = client.post("/api/ai/enqueue", json=_payload())
    assert response.status_code == 401


def test_enqueue_with_valid_token(client, valid_token_factory, mocker):
    job = MagicMock()
    job.id = "job-abc-123"
    queue = MagicMock()
    queue.enqueue.return_value = job
    mocker.patch("app.routers.ai._queue", return_value=queue)

    token = valid_token_factory()
    response = client.post(
        "/api/ai/enqueue",
        json=_payload(2),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == "job-abc-123"
    assert body["enqueued"] == 2
    queue.enqueue.assert_called_once()
    enqueue_args = queue.enqueue.call_args
    assert enqueue_args.args[0] == "app.workers.ai_pipeline.generate_batch_job"
    sent_items = enqueue_args.args[1]
    assert len(sent_items) == 2
    assert sent_items[0]["entity_id"] == "c0"


def test_enqueue_rejects_empty_items(client, valid_token_factory):
    token = valid_token_factory()
    response = client.post(
        "/api/ai/enqueue",
        json={"items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_status_requires_auth(client):
    response = client.get("/api/ai/status/any-id")
    assert response.status_code == 401


def test_status_not_found(client, valid_token_factory, mocker):
    mocker.patch("app.routers.ai._redis_client", return_value=MagicMock())
    mocker.patch(
        "app.routers.ai.Job.fetch",
        side_effect=NoSuchJobError("not found"),
    )

    token = valid_token_factory()
    response = client.get(
        "/api/ai/status/missing",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


def test_status_returns_summary(client, valid_token_factory, mocker):
    mocker.patch("app.routers.ai._redis_client", return_value=MagicMock())
    job = MagicMock()
    job.get_status.return_value = "finished"
    job.result = {
        "requested": 5,
        "generated": 4,
        "failed": 1,
        "cost_usd": 0.012,
    }
    mocker.patch("app.routers.ai.Job.fetch", return_value=job)

    token = valid_token_factory()
    response = client.get(
        "/api/ai/status/job-xyz",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == "job-xyz"
    assert body["status"] == "finished"
    assert body["total"] == 5
    assert body["completed"] == 4
    assert body["failed"] == 1
    assert body["cost_usd"] == 0.012

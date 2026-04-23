from unittest.mock import MagicMock

import pytest


def test_liveness_always_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "gastroed-backend"}


def test_readiness_ok_when_deps_respond(client, mocker):
    supabase = MagicMock()
    mocker.patch("app.db.supabase_client.get_supabase", return_value=supabase)
    mocker.patch("redis.Redis.from_url", return_value=MagicMock())

    response = client.get("/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["supabase"] == "ok"
    assert body["checks"]["redis"] == "ok"


def test_readiness_degraded_on_supabase_failure(client, mocker):
    def _fail():
        raise RuntimeError("pg down")

    supabase = MagicMock()
    supabase.table.return_value.select.return_value.limit.return_value.execute.side_effect = _fail
    mocker.patch("app.db.supabase_client.get_supabase", return_value=supabase)
    mocker.patch("redis.Redis.from_url", return_value=MagicMock())

    response = client.get("/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert "error" in body["checks"]["supabase"]


def test_readiness_degraded_on_redis_failure(client, mocker):
    supabase = MagicMock()
    mocker.patch("app.db.supabase_client.get_supabase", return_value=supabase)

    redis_mock = MagicMock()
    redis_mock.ping.side_effect = RuntimeError("redis unreachable")
    mocker.patch("redis.Redis.from_url", return_value=redis_mock)

    response = client.get("/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert "error" in body["checks"]["redis"]


@pytest.mark.parametrize("endpoint", ["/health", "/health/ready"])
def test_health_endpoints_do_not_require_auth(client, endpoint, mocker):
    mocker.patch("app.db.supabase_client.get_supabase", return_value=MagicMock())
    mocker.patch("redis.Redis.from_url", return_value=MagicMock())
    response = client.get(endpoint)
    assert response.status_code in (200, 503)

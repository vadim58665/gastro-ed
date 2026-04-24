import time

import jwt
import pytest
from fastapi.testclient import TestClient


def test_http_exception_includes_request_id(client):
    response = client.get("/me")  # 401
    assert response.status_code == 401
    body = response.json()
    assert body["error"] == "http_error"
    assert "request_id" in body
    assert body["request_id"] == response.headers["X-Request-ID"]


def test_validation_exception_includes_request_id_and_details(client, valid_token_factory):
    token = valid_token_factory()
    response = client.post(
        "/api/ai/enqueue",
        json={"items": []},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "detail" in body
    assert isinstance(body["detail"], list)
    assert "request_id" in body


@pytest.fixture
def lenient_client(app):
    """TestClient с raise_server_exceptions=False, чтобы exception handler
    для неперехваченных Exception мог вернуть JSON вместо проброса в тест."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_unhandled_exception_returns_500_with_request_id(lenient_client, mocker):
    mocker.patch(
        "app.routers.analytics.aggregate_mistakes",
        side_effect=RuntimeError("unexpected"),
    )

    now = int(time.time())
    token = jwt.encode(
        {
            "sub": "u-500",
            "email": "x@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iat": now,
            "exp": now + 3600,
        },
        "test-secret-for-pytest-only-minimum-32-bytes",
        algorithm="HS256",
    )
    response = lenient_client.get(
        "/api/analytics/mistakes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "internal_error"
    assert "request_id" in body

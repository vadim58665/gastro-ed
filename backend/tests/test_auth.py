import pytest

from app.auth.jwt import TokenError, decode_supabase_jwt


def test_me_requires_auth(client):
    response = client.get("/me")
    assert response.status_code == 401


def test_me_rejects_invalid_bearer(client):
    response = client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
    assert "Invalid token" in response.json()["detail"]


def test_me_rejects_wrong_secret(client, wrong_secret_token):
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {wrong_secret_token}"},
    )
    assert response.status_code == 401


def test_me_rejects_expired_token(client, expired_token):
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_me_accepts_valid_token(client, valid_token_factory):
    token = valid_token_factory(user_id="abc-123", email="doctor@umnyvrach.ru")
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "abc-123"
    assert body["email"] == "doctor@umnyvrach.ru"
    assert body["role"] == "authenticated"


def test_decode_rejects_missing_audience(settings):
    import time

    import jwt

    token = jwt.encode(
        {"sub": "u", "iat": int(time.time()), "exp": int(time.time()) + 60},
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(TokenError):
        decode_supabase_jwt(token, settings.supabase_jwt_secret)

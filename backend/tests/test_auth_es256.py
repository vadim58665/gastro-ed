from __future__ import annotations

import time
from typing import Any
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app.auth.jwt import TokenError, _jwks_clients, decode_supabase_jwt


def _ec_keypair() -> tuple[ec.EllipticCurvePrivateKey, dict[str, Any]]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_numbers = private_key.public_key().public_numbers()
    x_bytes = public_numbers.x.to_bytes(32, "big")
    y_bytes = public_numbers.y.to_bytes(32, "big")

    import base64

    def _b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    jwk = {
        "kty": "EC",
        "crv": "P-256",
        "alg": "ES256",
        "use": "sig",
        "kid": "test-key-1",
        "x": _b64(x_bytes),
        "y": _b64(y_bytes),
    }
    return private_key, jwk


def _encode_es256(private_key: ec.EllipticCurvePrivateKey, payload: dict, kid: str) -> str:
    return jwt.encode(payload, private_key, algorithm="ES256", headers={"kid": kid})


@pytest.fixture(autouse=True)
def _clear_jwks_cache():
    _jwks_clients.clear()
    yield
    _jwks_clients.clear()


@pytest.fixture
def es256_setup(settings):
    private_key, jwk = _ec_keypair()
    jwks_doc = {"keys": [jwk]}

    with patch("jwt.jwks_client.PyJWKClient.fetch_data", return_value=jwks_doc):
        yield private_key, settings


def _valid_es256_payload(
    user_id: str = "es256-user",
    email: str = "es256@example.com",
) -> dict:
    now = int(time.time())
    return {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }


def test_accepts_valid_es256_token(es256_setup):
    private_key, settings = es256_setup
    token = _encode_es256(private_key, _valid_es256_payload(), kid="test-key-1")

    payload = decode_supabase_jwt(token, settings)

    assert payload["sub"] == "es256-user"
    assert payload["email"] == "es256@example.com"
    assert payload["role"] == "authenticated"


def test_rejects_expired_es256_token(es256_setup):
    private_key, settings = es256_setup
    payload = _valid_es256_payload()
    payload["exp"] = int(time.time()) - 10
    token = _encode_es256(private_key, payload, kid="test-key-1")

    with pytest.raises(TokenError, match="expired"):
        decode_supabase_jwt(token, settings)


def test_rejects_es256_with_unknown_kid(es256_setup):
    private_key, settings = es256_setup
    token = _encode_es256(private_key, _valid_es256_payload(), kid="unknown-kid")

    with pytest.raises(TokenError, match="JWKS key not found"):
        decode_supabase_jwt(token, settings)


def test_rejects_es256_with_wrong_audience(es256_setup):
    private_key, settings = es256_setup
    payload = _valid_es256_payload()
    payload["aud"] = "wrong-audience"
    token = _encode_es256(private_key, payload, kid="test-key-1")

    with pytest.raises(TokenError, match="Invalid token"):
        decode_supabase_jwt(token, settings)


def test_rejects_es256_with_tampered_signature(es256_setup):
    private_key, settings = es256_setup
    other_key, _ = _ec_keypair()
    token = _encode_es256(other_key, _valid_es256_payload(), kid="test-key-1")

    with pytest.raises(TokenError, match="Invalid token"):
        decode_supabase_jwt(token, settings)


def test_me_endpoint_accepts_es256(client, es256_setup):
    private_key, _ = es256_setup
    token = _encode_es256(
        private_key,
        _valid_es256_payload(user_id="doc-42", email="doc42@example.com"),
        kid="test-key-1",
    )

    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == "doc-42"
    assert body["email"] == "doc42@example.com"


def test_jwks_url_defaults_from_supabase_url(settings):
    assert settings.jwks_url.endswith("/auth/v1/.well-known/jwks.json")


def test_jwks_url_override(monkeypatch):
    from app.config import Settings

    custom = "https://custom.example.com/jwks.json"
    s = Settings(supabase_jwks_url=custom)
    assert s.jwks_url == custom

from __future__ import annotations

import os
import time
from collections.abc import Iterator
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient

TEST_JWT_SECRET = "test-secret-for-pytest-only-minimum-32-bytes"

os.environ.setdefault("TESTING", "true")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_JWT_SECRET", TEST_JWT_SECRET)

from app.config import Settings, get_settings  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture
def settings() -> Settings:
    get_settings.cache_clear()
    return get_settings()


@pytest.fixture
def app(settings: Settings):
    return create_app(settings=settings)


@pytest.fixture
def client(app) -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


def _encode(payload: dict[str, Any], secret: str = TEST_JWT_SECRET) -> str:
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def valid_token_factory():
    def _make(
        user_id: str = "11111111-1111-1111-1111-111111111111",
        email: str = "doc@example.com",
        role: str = "authenticated",
        expires_in: int = 3600,
    ) -> str:
        now = int(time.time())
        return _encode(
            {
                "sub": user_id,
                "email": email,
                "role": role,
                "aud": "authenticated",
                "iat": now,
                "exp": now + expires_in,
            }
        )

    return _make


@pytest.fixture
def expired_token(valid_token_factory) -> str:
    return valid_token_factory(expires_in=-10)


@pytest.fixture
def wrong_secret_token() -> str:
    return _encode(
        {
            "sub": "x",
            "email": "x@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        },
        secret="totally-different-secret-also-thirty-two-bytes",
    )

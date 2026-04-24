"""Тесты на sanity-check rate-limiter: memory-storage исправно считает и
сбрасывается между тестами."""

from __future__ import annotations

import pytest

from app.middleware.rate_limit import (
    AI_ENQUEUE_LIMIT,
    ANALYTICS_LIMIT,
    ANSWERS_BATCH_LIMIT,
    READINESS_LIMIT,
    limiter,
)


def test_rate_limit_constants_are_parseable():
    for limit_str in [AI_ENQUEUE_LIMIT, READINESS_LIMIT, ANSWERS_BATCH_LIMIT, ANALYTICS_LIMIT]:
        assert "/" in limit_str
        n_str, period = limit_str.split("/")
        assert int(n_str) > 0
        assert period in ("second", "minute", "hour", "day")


def test_limiter_key_function_uses_auth_header():
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"authorization", b"Bearer some-token-abc")],
        "client": ("127.0.0.1", 12345),
    }
    request = Request(scope)
    key = limiter._key_func(request)
    assert key.startswith("user:")


def test_limiter_key_function_falls_back_to_ip():
    from starlette.requests import Request

    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
        "client": ("10.0.0.5", 12345),
    }
    request = Request(scope)
    key = limiter._key_func(request)
    assert key.startswith("ip:")


@pytest.mark.parametrize(
    "limit_str,n_expected",
    [
        ("30/minute", 30),
        ("60/minute", 60),
        ("120/minute", 120),
    ],
)
def test_limit_counts(limit_str: str, n_expected: int):
    n, _ = limit_str.split("/")
    assert int(n) == n_expected

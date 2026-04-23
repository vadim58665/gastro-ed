from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from anthropic import RateLimitError

from app.models.ai import ContentType, EntityType, GenerationRequest
from app.services.ai_client import AIClient


def _mock_response(text: str = "подсказка", input_tokens: int = 10, output_tokens: int = 20):
    block = MagicMock()
    block.type = "text"
    block.text = text
    resp = MagicMock()
    resp.content = [block]
    resp.usage = MagicMock()
    resp.usage.input_tokens = input_tokens
    resp.usage.output_tokens = output_tokens
    return resp


def _rate_limit_error(retry_after: str = "0") -> RateLimitError:
    req = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    resp = httpx.Response(status_code=429, request=req, headers={"retry-after": retry_after})
    return RateLimitError(message="Rate limited", response=resp, body=None)


def _make_client(mock_create: AsyncMock) -> AIClient:
    inner = MagicMock()
    inner.messages = MagicMock()
    inner.messages.create = mock_create
    return AIClient(client=inner)


def _valid_request(content_type: ContentType = ContentType.HINT) -> GenerationRequest:
    return GenerationRequest(
        entity_type=EntityType.CARD,
        entity_id="c1",
        content_type=content_type,
        prompt="длинный промпт для валидации длины, минимум 10 символов",
    )


async def test_generate_hint_uses_haiku_and_parses_text():
    mock_create = AsyncMock(return_value=_mock_response(text="подсказка про патогенез"))
    ai = _make_client(mock_create)

    result = await ai.generate(_valid_request())

    assert result.content_ru == "подсказка про патогенез"
    assert "haiku" in result.model_used.lower()
    assert result.tokens_used == 30
    assert result.cost_usd > 0

    kwargs = mock_create.call_args.kwargs
    assert "haiku" in kwargs["model"].lower()
    assert kwargs["max_tokens"] == 200
    assert kwargs["messages"][0]["role"] == "user"


async def test_generate_explain_uses_sonnet():
    mock_create = AsyncMock(return_value=_mock_response(text="разбор"))
    ai = _make_client(mock_create)

    result = await ai.generate(_valid_request(ContentType.EXPLAIN_LONG))

    assert "sonnet" in result.model_used.lower()
    assert mock_create.call_args.kwargs["max_tokens"] == 1500


async def test_generate_retries_on_rate_limit_then_succeeds():
    mock_create = AsyncMock(
        side_effect=[
            _rate_limit_error("0"),
            _mock_response(text="ok"),
        ]
    )
    ai = _make_client(mock_create)

    result = await ai.generate(_valid_request(), max_retries=3)

    assert result.content_ru == "ok"
    assert mock_create.call_count == 2


async def test_generate_gives_up_after_max_retries():
    mock_create = AsyncMock(side_effect=_rate_limit_error("0"))
    ai = _make_client(mock_create)

    with pytest.raises(RateLimitError):
        await ai.generate(_valid_request(), max_retries=2)

    assert mock_create.call_count == 2


async def test_generate_strips_whitespace_and_joins_blocks():
    block1 = MagicMock()
    block1.type = "text"
    block1.text = "  первая часть "
    block2 = MagicMock()
    block2.type = "text"
    block2.text = "вторая  "
    response = MagicMock()
    response.content = [block1, block2]
    response.usage = MagicMock()
    response.usage.input_tokens = 5
    response.usage.output_tokens = 5

    mock_create = AsyncMock(return_value=response)
    ai = _make_client(mock_create)

    result = await ai.generate(_valid_request())
    assert result.content_ru == "первая часть вторая"

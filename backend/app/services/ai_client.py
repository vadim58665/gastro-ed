"""Обёртка над Anthropic AsyncClient с retry-логикой на rate limits."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Protocol

from anthropic import (
    APIConnectionError,
    APITimeoutError,
    AsyncAnthropic,
    InternalServerError,
    RateLimitError,
)

from app.config import get_settings
from app.models.ai import GenerationRequest, GenerationResult
from app.services.prompts import (
    SYSTEM_PROMPTS,
    estimate_cost_usd,
    max_tokens_for,
    model_for,
)

log = logging.getLogger(__name__)


class _Usage(Protocol):
    input_tokens: int
    output_tokens: int


class _Content(Protocol):
    type: str


def _extract_text(response) -> str:  # noqa: ANN001
    parts: list[str] = []
    for block in response.content:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", ""))
    return "".join(parts).strip()


def _retry_after_seconds(err: RateLimitError) -> float | None:
    headers = getattr(getattr(err, "response", None), "headers", None) or {}
    raw = headers.get("retry-after") if hasattr(headers, "get") else None
    try:
        value = float(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None
    return value if value and value > 0 else None


@dataclass
class AIClient:
    """Тонкая обёртка, чтобы мокать в тестах через подмену `client`."""

    client: AsyncAnthropic

    @classmethod
    def create(cls, api_key: str | None = None) -> AIClient:
        api_key = api_key or get_settings().anthropic_api_key
        return cls(client=AsyncAnthropic(api_key=api_key))

    async def generate(
        self,
        req: GenerationRequest,
        *,
        max_retries: int = 4,
    ) -> GenerationResult:
        model = model_for(req.content_type)
        system = SYSTEM_PROMPTS[req.content_type]
        max_tokens = max_tokens_for(req.content_type)

        response = None
        last_err: BaseException | None = None
        for attempt in range(1, max_retries + 1):
            try:
                response = await self.client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    system=system,
                    messages=[{"role": "user", "content": req.prompt}],
                )
                break
            except RateLimitError as err:
                last_err = err
                if attempt >= max_retries:
                    raise
                wait_s = _retry_after_seconds(err) or min(30.0, 2.0 * attempt * attempt)
                log.warning(
                    "rate limited on %s/%s, retry in %.1fs (attempt %d)",
                    req.entity_type.value,
                    req.entity_id,
                    wait_s,
                    attempt,
                )
                await asyncio.sleep(wait_s)
            except (APIConnectionError, APITimeoutError, InternalServerError) as err:
                last_err = err
                if attempt >= max_retries:
                    raise
                # Экспоненциальный backoff для транзиентных сетевых/5xx ошибок.
                wait_s = min(30.0, 1.0 * 2 ** (attempt - 1))
                log.warning(
                    "transient error on %s/%s (%s), retry in %.1fs (attempt %d)",
                    req.entity_type.value,
                    req.entity_id,
                    type(err).__name__,
                    wait_s,
                    attempt,
                )
                await asyncio.sleep(wait_s)

        if response is None:
            raise last_err or RuntimeError("AI response is empty")

        text = _extract_text(response)
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens

        return GenerationResult(
            entity_type=req.entity_type,
            entity_id=req.entity_id,
            content_type=req.content_type,
            content_ru=text,
            model_used=model,
            tokens_used=input_tokens + output_tokens,
            cost_usd=estimate_cost_usd(model, input_tokens, output_tokens),
        )

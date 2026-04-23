"""Structured logging middleware: request_id + timings в каждом запросе."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

log = logging.getLogger("http")

REQUEST_ID_HEADER = "X-Request-ID"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # noqa: ANN001
        request_id = request.headers.get(REQUEST_ID_HEADER) or uuid.uuid4().hex[:16]
        request.state.request_id = request_id

        started = time.perf_counter()
        response: Response | None = None
        status_code = 500
        error: Exception | None = None

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            error = exc
            raise
        finally:
            duration_ms = (time.perf_counter() - started) * 1000.0
            user_agent = request.headers.get("user-agent", "")[:200]
            log.info(
                "http_request",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query)[:500],
                    "status": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "user_agent": user_agent,
                    "error": repr(error) if error else None,
                },
            )

        if response is not None:
            response.headers[REQUEST_ID_HEADER] = request_id
        return response

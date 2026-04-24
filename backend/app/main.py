import logging
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.auth.jwt import CurrentUser, get_current_user
from app.config import Settings, get_settings
from app.exceptions import (
    http_exception_handler,
    rate_limit_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.health import router as health_router
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import limiter
from app.routers import ai as ai_router
from app.routers import analytics as analytics_router
from app.routers import answers as answers_router
from app.routers import readiness as readiness_router

log = logging.getLogger("app.main")


def _configure_logging() -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(name)s %(levelname)s %(message)s"))
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    _configure_logging()

    issues = settings.validate_production_secrets()
    if issues:
        msg = "Refusing to start in production with unsafe config:\n  " + "\n  ".join(issues)
        log.error(msg)
        raise RuntimeError(msg)

    application = FastAPI(
        title="УмныйВрач Backend",
        version="0.4.1",
        description="Перенос тяжёлой логики с фронта: AI-очередь, readiness, FSRS, аналитика.",
    )

    application.state.limiter = limiter

    allow_origins = ["*"] if settings.environment == "development" else settings.cors_origins
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(RequestLoggingMiddleware)

    application.add_exception_handler(StarletteHTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    application.add_exception_handler(Exception, unhandled_exception_handler)

    application.include_router(health_router)
    application.include_router(ai_router.router)
    application.include_router(readiness_router.router)
    application.include_router(answers_router.router)
    application.include_router(analytics_router.router)

    @application.get("/me")
    async def me(
        user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> dict[str, str | None]:
        return {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
        }

    return application


app = create_app()

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.jwt import CurrentUser, get_current_user
from app.config import Settings, get_settings
from app.routers import ai as ai_router
from app.routers import readiness as readiness_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    application = FastAPI(
        title="УмныйВрач Backend",
        version="0.2.0",
        description="Перенос тяжёлой логики с фронта: AI-очередь, readiness, FSRS, аналитика.",
    )

    allow_origins = ["*"] if settings.environment == "development" else settings.cors_origins
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "gastroed-backend"}

    @application.get("/me")
    async def me(
        user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> dict[str, str | None]:
        return {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
        }

    application.include_router(ai_router.router)
    application.include_router(readiness_router.router)

    return application


app = create_app()

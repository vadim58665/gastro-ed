# УмныйВрач: Python backend

FastAPI-сервис, на который поэтапно переезжает тяжёлая логика с фронта
(AI-очередь, расчёт готовности к аккредитации, синхронизация прогресса,
аналитика). Supabase остаётся как БД + Auth.

## Фазы

| Фаза | Цель | Статус |
|---|---|---|
| 0 | Инфраструктура: FastAPI скелет, JWT, Docker, pytest, CI | ✅ в работе |
| 1 | AI-pipeline: генерация подсказок и объяснений через RQ | планируется |
| 2 | Readiness: формула P(pass) | планируется |
| 3 | Синхронизация progress (user_answers, fsrs_state) | планируется |
| 4 | Аналитика: /mistakes, leaderboard, графики | планируется |
| 5 | Уборка дубликатов на клиенте | планируется |

Полный план: `docs/superpowers/specs/*-python-backend-design.md` (после утверждения брифа).

## Структура

```
backend/
├── pyproject.toml       # зависимости + ruff + pytest
├── Dockerfile           # Python 3.12-slim
├── .env.example         # шаблон конфигурации
├── app/
│   ├── main.py          # create_app() + /health + /me
│   ├── config.py        # pydantic-settings
│   ├── auth/jwt.py      # Supabase JWT валидация (HS256)
│   ├── db/              # supabase-py клиент (singleton)
│   ├── routers/         # API роуты (Фазы 1+)
│   ├── services/        # бизнес-логика (readiness, FSRS)
│   └── workers/         # RQ-задачи
└── tests/               # pytest
```

## Локальная разработка

### Вариант 1 — Docker Compose (рекомендуется)

```bash
# Из корня worktree
cp backend/.env.example backend/.env
# отредактировать .env если нужны реальные секреты

docker compose up --build
```

API доступен на `http://localhost:8000`. Swagger — `http://localhost:8000/docs`.
Redis поднимается автоматически.

### Вариант 2 — venv напрямую

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env

uvicorn app.main:app --reload
```

## Тесты

```bash
cd backend
pytest -v
```

Тесты используют мок-JWT секрет и in-memory TestClient, реальные сервисы не
требуются.

## Линт и форматирование

```bash
cd backend
ruff check .        # проверка
ruff check . --fix  # автофикс
ruff format .       # форматирование
```

## Secrets

В `.env` (локально) или Railway Secrets (продакшен):

| Переменная | Назначение |
|---|---|
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (Dashboard → API) |
| `SUPABASE_JWT_SECRET` | JWT secret для валидации клиентских токенов |
| `ANTHROPIC_API_KEY` | Claude API (Фаза 1+) |
| `REDIS_URL` | строка подключения к Redis |

## Проверка установки

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"gastroed-backend"}

curl http://localhost:8000/me
# 403 — нужен Bearer-токен
```

## Что дальше

Когда Фаза 0 пройдёт review и merge в main:
1. Поднимаем Railway-проект и подключаем GitHub auto-deploy
2. Переходим к Фазе 1 (порт `scripts/prebuild-content.ts` в `app/workers/ai_pipeline.py`)

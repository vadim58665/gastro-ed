# УмныйВрач: Python backend

FastAPI-сервис, на который поэтапно переезжает тяжёлая логика с фронта
(AI-очередь, расчёт готовности к аккредитации, синхронизация прогресса,
аналитика). Supabase остаётся как БД + Auth.

## Фазы

| Фаза | Цель | Статус |
|---|---|---|
| 0 | Инфраструктура: FastAPI скелет, JWT, Docker, pytest, CI | ✅ готово |
| 1 | AI-pipeline: генерация подсказок и объяснений через RQ | ✅ готово |
| 2 | Readiness: формула P(pass) | ✅ в работе |
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

## AI pipeline (Фаза 1)

Эндпойнты (все требуют Supabase JWT):

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/ai/enqueue` | Поставить батч на генерацию (до 200 элементов) |
| GET | `/api/ai/status/{job_id}` | Статус и результат батча |

Формат тела запроса:

```json
{
  "items": [
    {
      "entity_type": "card",
      "entity_id": "cc-hep-3",
      "content_type": "hint",
      "prompt": "Тип карточки: ...\nВопрос: ...\nВарианты: ..."
    }
  ]
}
```

Ответ POST `/enqueue`: `{"job_id": "...", "enqueued": N}`.
Ответ GET `/status/...`: `{"status": "finished|queued|started|failed", "total", "completed", "failed", "cost_usd"}`.

### Локальный прогон пачкой без HTTP

```bash
cd backend
source .venv/bin/activate
python -m app.cli generate /tmp/batch.json --limit=5 --dry-run
```

Формат файла: `{"items": [GenerationRequest, ...]}`. Без `--dry-run` реально
вызывает Anthropic API - используйте осторожно (по правилам проекта - только с
согласования на каждый прогон).

### Модели и цены

| Тип контента | Модель | Стоимость (input/output per 1M) |
|---|---|---|
| hint | claude-haiku-4-5-20251001 | $1 / $5 |
| explain_short | claude-sonnet-4-6 | $3 / $15 |
| explain_long | claude-sonnet-4-6 | $3 / $15 |

## Readiness (Фаза 2)

Эндпойнт: `POST /api/readiness/compute` (требует JWT).

Вход - снимок `questionStats` из клиента + список вопросов с `block_number`:

```json
{
  "specialty": "gastroenterologiya",
  "questions": [
    {
      "question_id": "q1",
      "block_number": 1,
      "stats": {
        "attempts": 3,
        "wrong": 1,
        "last_seen_ms": 1700000000000,
        "was_ever_correct": true,
        "last_answer_correct": true,
        "correct_streak": 2
      }
    }
  ],
  "now_ms": 1700000500000
}
```

Выход - отчёт готовности:

- `exam_readiness` и `exam_readiness_percent` (P(≥70% на экзамене из 80 вопросов))
- `coverage` (доля вопросов с attempts > 0)
- `average_strength` (средняя p_correct)
- `weak_count` (count p < 0.4)
- `blocks[]` с уровнями `not_started | started | weak | ready | strong`

Формула по [спеке readiness 2026-04-20](../docs/superpowers/specs/2026-04-20-readiness-formula-design.md):

- `p_correct(q) = 0.25 + 0.75 × exp(-days_since_seen / S)` при streak ≥ 1
- `S = 3 × 2^(streak-1)` (базовая стабильность удваивается за каждый правильный подряд)
- При последнем неверном ответе - возврат к baseline 0.25
- `P(sum_of_correct ≥ 56) = 1 - Φ((55.5 - μ) / σ)` (CLT)

На Фазе 2 Python не хранит прогресс - клиент передаёт снимок localStorage. В Фазе 3 прогресс переедет в Supabase, и endpoint станет самодостаточным.

## Что дальше

Когда Фазы 0-2 пройдут review и merge в main:
1. Поднимаем Railway-проект и подключаем GitHub auto-deploy
2. Фаза 3: синхронизация прогресса в Supabase (`user_answers`, `fsrs_state`)

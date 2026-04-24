# УмныйВрач: Python backend

FastAPI-сервис, на который поэтапно переезжает тяжёлая логика с фронта
(AI-очередь, расчёт готовности к аккредитации, синхронизация прогресса,
аналитика). Supabase остаётся как БД + Auth.

## Фазы

| Фаза | Цель | Статус |
|---|---|---|
| 0 | Инфраструктура: FastAPI скелет, JWT, Docker, pytest, CI | ✅ готово |
| 1 | AI-pipeline: генерация подсказок и объяснений через RQ | ✅ готово |
| 2 | Readiness: формула P(pass) | ✅ готово |
| 3 | Синхронизация progress (user_answers, fsrs_state) - backend | ✅ готово |
| 4 | Аналитика: /mistakes, leaderboard, графики | ✅ готово |
| 4.5 | Production-readiness: logging, rate limits, healthchecks, Procfile | ✅ готово |
| 5a | Фронт-клиент: HTTP-обёртка, типизированные wrappers, feature flag | ✅ в работе |
| 5b | Замена хуков на fetch, Service Worker, bulk-import localStorage | ждёт Railway |

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

## Sync progress (Фаза 3, backend-сторона)

Endpoints (все требуют JWT, пишут под `auth.uid()`):

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/api/answers/batch` | Принять батч ответов + FSRS-состояний |
| GET | `/api/fsrs/state?since=ms&source=feed` | Дельта FSRS-состояний |
| GET | `/api/answers/since?since=ms&limit=1000` | Журнал ответов с timestamp |

Идемпотентность: каждый ответ содержит `idempotency_key` (генерирует клиент), UPSERT игнорирует дубликаты. Безопасно переотправлять.

FSRS math остаётся на клиенте (Web Worker). Сервер хранит зеркало `fsrs_state` как JSON и возвращает дельты для синхронизации.

Миграция: `supabase/migrations/012_user_answers_and_fsrs.sql` создаёт таблицы с RLS под `auth.uid() = user_id`. Применяется через `supabase migration up` или Supabase Dashboard.

## Analytics (Фаза 4)

Endpoints (все требуют JWT):

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/analytics/mistakes?period_days=30&entity_type=card&limit=50` | Топ-N ошибок пользователя |
| GET | `/api/analytics/leaderboard/daily-case?case_date=2026-04-20` | Лидерборд дня с nickname |
| GET | `/api/analytics/stats/monthly?year=2026&month=4` | Time series по дням за месяц |

Источник данных - `user_answers` (Фаза 3) и `daily_case_results` (миграция 007).
Для 100-1000 пользователей агрегация в Python ок; при росте заменяется SQL RPC.

## Production-readiness (Фаза 4.5)

- **Logging**: `RequestLoggingMiddleware` вешает `X-Request-ID` на каждый ответ, пишет в лог method/path/status/duration
- **Healthchecks**: `/health` (liveness) и `/health/ready` (проверяет Supabase + Redis, возвращает 503 если что-то недоступно)
- **Rate limiting**: `slowapi` с in-memory storage, ключ по JWT или IP. Лимиты: AI enqueue 30/мин, readiness 60/мин, answers 60/мин, analytics 120/мин
- **Exception handlers**: все ошибки возвращаются как JSON с `{error, detail, request_id}`
- **Config validation**: в `environment=production` отказываемся стартовать с мок-secret'ами или коротким JWT секретом
- **Railway**: `Procfile` с сервисами `web` (uvicorn --workers 2) и `worker` (RQ), плюс `railway.toml` с healthcheck путём

## Фронт-клиент (Фаза 5a)

В `src/lib/backendClient.ts` и `src/lib/backend/*.ts`:

- `backendFetch<T>(path, options)` - универсальная обёртка с авто-подставкой Supabase JWT, timeout'ом, `X-Request-ID` tracking
- `BackendReadiness.computeReadinessRemote(payload)` - POST `/api/readiness/compute`
- `BackendAnalytics.fetchMistakes()`, `fetchDailyCaseLeaderboard()`, `fetchMonthlyStats()`
- `BackendSync.submitBatch()`, `fetchFsrsState()`, `fetchAnswersSince()`
- `BackendAi.enqueueBatch()`, `fetchJobStatus()`

**Feature flag.** Все функции проверяют `NEXT_PUBLIC_BACKEND_URL`:
- Пусто (default) → `BackendDisabledError` → вызывающий код делает fallback на старую локальную логику
- Задано → обычный HTTP-запрос

Это позволяет коммитить фронтовую интеграцию БЕЗ живого Railway. После деплоя просто задаётся env в Vercel и все новые пути начинают работать.

Пример использования в компоненте:

```tsx
import { isBackendEnabled, BackendReadiness } from "@/lib/backend";

async function getReadiness(payload) {
  if (isBackendEnabled()) {
    try {
      return await BackendReadiness.computeReadinessRemote(payload);
    } catch (err) {
      console.warn("Backend unavailable, falling back to local", err);
    }
  }
  return computeReadinessLocal(payload); // старая логика
}
```

## Что дальше

Когда Фазы 0-5a пройдут review и merge в main:
1. Поднимаем Railway-проект, привязываем GitHub repo, добавляем Redis плагин, пробрасываем secrets
2. В Vercel задаём `NEXT_PUBLIC_BACKEND_URL=https://<railway-url>`
3. Фаза 5b - замена `useAccreditation`/`useReview` вычислений на fetch, Service Worker + BackgroundSync, одноразовый bulk-import localStorage
4. Первый реальный прогон AI pipeline на 10-50 карт (требует явного согласования)

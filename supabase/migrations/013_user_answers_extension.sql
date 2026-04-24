-- 013: Расширение существующей таблицы public.user_answers под Python-бэкенд.
--
-- В БД уже есть user_answers (колонки: id, user_id, card_id, is_correct,
-- answered_at, error_type, error_explanation) и review_cards (user_id,
-- card_id, fsrs_state, due, last_review, updated_at). Мы их НЕ пересоздаём -
-- только добавляем недостающие поля для идемпотентной синхронизации
-- с Python-бэкенда и для поддержки аккредитационных вопросов.
--
-- Миграция идемпотентна: ADD COLUMN IF NOT EXISTS и CREATE INDEX IF NOT EXISTS.

-- ========== user_answers: новые колонки ==========

ALTER TABLE public.user_answers
    ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'card',
    ADD COLUMN IF NOT EXISTS time_spent_ms integer,
    ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'feed',
    ADD COLUMN IF NOT EXISTS idempotency_key text;

-- CHECK constraints на новые колонки (добавляем только если их нет)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_answers_entity_type_check'
    ) THEN
        ALTER TABLE public.user_answers
            ADD CONSTRAINT user_answers_entity_type_check
            CHECK (entity_type IN ('card', 'accreditation_question'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_answers_source_check'
    ) THEN
        ALTER TABLE public.user_answers
            ADD CONSTRAINT user_answers_source_check
            CHECK (source IN ('feed', 'prep', 'exam', 'browse'));
    END IF;
END $$;

-- Индексы для типовых запросов Python-бэкенда
CREATE INDEX IF NOT EXISTS idx_user_answers_user_answered_at
    ON public.user_answers (user_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_entity
    ON public.user_answers (user_id, entity_type, card_id);

-- Частичный UNIQUE-индекс для идемпотентного UPSERT: дубликаты при
-- переотправке батча игнорируются. NULL-значения не учитываются
-- в UNIQUE (старые записи без ключа не мешают).
CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_answers_user_idempotency
    ON public.user_answers (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- ========== review_cards: никаких изменений ==========
-- Используем как есть для FSRS-state синхронизации (см. backend/app/services/answers_store.py).

COMMENT ON COLUMN public.user_answers.entity_type IS
    'Тип сущности: card | accreditation_question. Default: card (для обратной совместимости).';
COMMENT ON COLUMN public.user_answers.source IS
    'Откуда пришёл ответ: feed | prep | exam | browse.';
COMMENT ON COLUMN public.user_answers.idempotency_key IS
    'Генерируется клиентом, UNIQUE per user. Для безопасной переотправки батчей.';
COMMENT ON COLUMN public.user_answers.time_spent_ms IS
    'Время ответа в миллисекундах (опционально).';

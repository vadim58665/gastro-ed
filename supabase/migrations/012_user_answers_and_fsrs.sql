-- Phase 3 (Python backend): синхронизация прогресса обучения.
--
-- user_answers - журнал каждого ответа (append-only, идемпотентный UPSERT).
-- fsrs_state   - зеркало FSRS-состояния карточки (клиент - master of math,
--                backend хранит последнее состояние для синхронизации между
--                устройствами).

-- ========== user_answers ==========

CREATE TABLE IF NOT EXISTS public.user_answers (
    id            bigserial PRIMARY KEY,
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type   text NOT NULL CHECK (entity_type IN ('card', 'accreditation_question')),
    entity_id     text NOT NULL,
    is_correct    boolean NOT NULL,
    answered_at   timestamptz NOT NULL DEFAULT now(),
    time_spent_ms integer,
    source        text NOT NULL DEFAULT 'feed' CHECK (source IN ('feed', 'prep', 'exam', 'browse')),
    idempotency_key text NOT NULL,
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_answered_at
    ON public.user_answers (user_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_entity
    ON public.user_answers (user_id, entity_type, entity_id);

ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_answers: users read own"
    ON public.user_answers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_answers: users insert own"
    ON public.user_answers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_answers: service_role full"
    ON public.user_answers FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- ========== fsrs_state ==========

CREATE TABLE IF NOT EXISTS public.fsrs_state (
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_id   text NOT NULL,
    source      text NOT NULL DEFAULT 'feed' CHECK (source IN ('feed', 'prep')),
    state       jsonb NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, entity_id, source)
);

CREATE INDEX IF NOT EXISTS idx_fsrs_state_user_updated_at
    ON public.fsrs_state (user_id, updated_at DESC);

ALTER TABLE public.fsrs_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsrs_state: users read own"
    ON public.fsrs_state FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "fsrs_state: users upsert own"
    ON public.fsrs_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fsrs_state: users update own"
    ON public.fsrs_state FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fsrs_state: service_role full"
    ON public.fsrs_state FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);

-- ========== Комментарии ==========

COMMENT ON TABLE public.user_answers IS
    'Journal ответов пользователя. UPSERT идемпотентный по (user_id, idempotency_key).';
COMMENT ON TABLE public.fsrs_state IS
    'FSRS-состояние карточки (клиент считает, сервер хранит зеркало для sync между устройствами).';

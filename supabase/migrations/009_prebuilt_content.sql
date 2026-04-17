-- Prebuilt AI content shared across all subscribers.
-- Unlike ai_generated_content (per-user cache for mnemonics/free-form),
-- this table stores deterministic hint/explain for each card and accreditation
-- question, generated once by scripts/prebuild-content.ts and served from DB
-- with no token cost on read.

create table if not exists prebuilt_content (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('card','accreditation_question')),
  entity_id text not null,
  content_type text not null check (content_type in ('hint','explain_short','explain_long')),
  content_ru text not null,
  model_used text not null,
  tokens_used int default 0,
  cost_usd numeric(8,6) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (entity_type, entity_id, content_type)
);

create index if not exists idx_prebuilt_lookup
  on prebuilt_content (entity_type, entity_id);

alter table prebuilt_content enable row level security;

-- Only active or trial subscribers can read prebuilt content.
-- Mutations happen via service role key (scripts + migrations).
create policy "prebuilt_select_pro"
  on prebuilt_content for select
  using (
    exists (
      select 1 from subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active','trial')
    )
  );

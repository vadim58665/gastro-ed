-- MedMind: подписки, граф знаний, AI-контент, чат, nudges

-- ═══ SUBSCRIPTIONS ═══

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'inactive'
    check (status in ('active','inactive','trial','past_due','cancelled')),
  plan text not null default 'free'
    check (plan in ('free','pro')),
  tier text not null default 'free'
    check (tier in ('free','feed_helper','accred_basic','accred_mentor','accred_tutor','accred_extreme')),
  price_rub int not null default 0
    check (price_rub in (0, 490, 1190, 2690, 5890, 9990)),
  yookassa_payment_id text,
  yookassa_subscription_id text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index idx_subscriptions_user on subscriptions(user_id);

-- ═══ KNOWLEDGE GRAPH ═══

create table knowledge_graph (
  user_id uuid not null references profiles(id) on delete cascade,
  topic text not null,
  specialty text not null,
  cards_attempted int default 0,
  cards_correct int default 0,
  error_rate numeric(5,4) default 0,
  mastery_score numeric(5,4) default 0,
  mastery_level text generated always as (
    case
      when error_rate > 0.50 then 'student'
      when error_rate > 0.30 then 'resident'
      when error_rate > 0.15 then 'doctor'
      when error_rate > 0.05 then 'professor'
      else 'academician'
    end
  ) stored,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  is_weak boolean generated always as (error_rate > 0.40) stored,
  updated_at timestamptz default now(),
  primary key (user_id, topic)
);

create index idx_kg_weak on knowledge_graph(user_id, is_weak) where is_weak = true;

-- ═══ AI-GENERATED CONTENT ═══

create table ai_generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  card_id text,
  topic text not null,
  content_type text not null
    check (content_type in (
      'mnemonic_acronym','mnemonic_story','mnemonic_rhyme',
      'memory_poem','flashcard','study_image','explanation','tip'
    )),
  content_ru text not null,
  image_url text,
  source_refs text[],
  model_used text,
  tokens_used int default 0,
  cost_usd numeric(8,6) default 0,
  created_at timestamptz default now()
);

create index idx_ai_content_user_topic on ai_generated_content(user_id, topic);

-- ═══ AI USAGE LOG ═══

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  model text not null,
  input_tokens int default 0,
  output_tokens int default 0,
  cost_usd numeric(8,6) default 0,
  created_at timestamptz default now()
);

create index idx_ai_usage_user on ai_usage_log(user_id, created_at);

-- ═══ CHAT HISTORY ═══

create table medmind_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  context_topic text,
  created_at timestamptz default now()
);

create index idx_chat_user on medmind_chat_history(user_id, created_at desc);

-- ═══ NUDGES ═══

create table medmind_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  nudge_type text not null
    check (nudge_type in (
      'overdue_review','weak_topic','streak_risk',
      'daily_session','new_content','milestone'
    )),
  title_ru text not null,
  body_ru text not null,
  action_url text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_nudges_unread on medmind_nudges(user_id, is_read) where is_read = false;

-- ═══ RLS ═══

alter table subscriptions enable row level security;
alter table knowledge_graph enable row level security;
alter table ai_generated_content enable row level security;
alter table ai_usage_log enable row level security;
alter table medmind_chat_history enable row level security;
alter table medmind_nudges enable row level security;

-- subscriptions
create policy "sub_select" on subscriptions for select using (user_id = auth.uid());
create policy "sub_insert" on subscriptions for insert with check (user_id = auth.uid());
create policy "sub_update" on subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- knowledge_graph
create policy "kg_select" on knowledge_graph for select using (user_id = auth.uid());
create policy "kg_insert" on knowledge_graph for insert with check (user_id = auth.uid());
create policy "kg_update" on knowledge_graph for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ai_generated_content
create policy "ai_content_select" on ai_generated_content for select using (user_id = auth.uid());
create policy "ai_content_insert" on ai_generated_content for insert with check (user_id = auth.uid());

-- ai_usage_log (user reads own; server inserts via service key)
create policy "usage_select" on ai_usage_log for select using (user_id = auth.uid());

-- medmind_chat_history
create policy "chat_select" on medmind_chat_history for select using (user_id = auth.uid());
create policy "chat_insert" on medmind_chat_history for insert with check (user_id = auth.uid());

-- medmind_nudges
create policy "nudge_select" on medmind_nudges for select using (user_id = auth.uid());
create policy "nudge_update" on medmind_nudges for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ═══ UPDATE TRIGGER ═══

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_progress (user_id) values (new.id);
  insert into public.subscriptions (user_id, status, plan, tier) values (new.id, 'inactive', 'free', 'free');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- GastroEd: начальная схема БД
-- Выполнить в Supabase Dashboard → SQL Editor

-- 1. Таблицы

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_progress (
  user_id uuid primary key references profiles(id) on delete cascade,
  streak_current int default 0,
  streak_best int default 0,
  total_points int default 0,
  cards_seen int default 0,
  cards_correct int default 0,
  last_active_date date,
  daily_goal int default 10,
  today_cards_seen int default 0,
  updated_at timestamptz default now()
);

create table review_cards (
  user_id uuid references profiles(id) on delete cascade,
  card_id text not null,
  fsrs_state jsonb not null,
  due timestamptz not null,
  last_review timestamptz,
  updated_at timestamptz default now(),
  primary key (user_id, card_id)
);

create table user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  card_id text not null,
  is_correct boolean not null,
  answered_at timestamptz default now()
);

create table daily_activity (
  user_id uuid references profiles(id) on delete cascade,
  activity_date date not null,
  cards_seen int default 0,
  cards_correct int default 0,
  points_earned int default 0,
  primary key (user_id, activity_date)
);

-- 2. Индексы

create index idx_review_cards_due on review_cards (user_id, due);
create index idx_user_answers_user on user_answers (user_id, answered_at);
create index idx_daily_activity_user on daily_activity (user_id, activity_date);

-- 3. RLS

alter table profiles enable row level security;
alter table user_progress enable row level security;
alter table review_cards enable row level security;
alter table user_answers enable row level security;
alter table daily_activity enable row level security;

-- profiles: id = auth.uid()
create policy "profiles_select" on profiles for select using (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());

-- user_progress
create policy "progress_select" on user_progress for select using (user_id = auth.uid());
create policy "progress_insert" on user_progress for insert with check (user_id = auth.uid());
create policy "progress_update" on user_progress for update using (user_id = auth.uid());

-- review_cards
create policy "review_select" on review_cards for select using (user_id = auth.uid());
create policy "review_insert" on review_cards for insert with check (user_id = auth.uid());
create policy "review_update" on review_cards for update using (user_id = auth.uid());

-- user_answers
create policy "answers_select" on user_answers for select using (user_id = auth.uid());
create policy "answers_insert" on user_answers for insert with check (user_id = auth.uid());

-- daily_activity
create policy "activity_select" on daily_activity for select using (user_id = auth.uid());
create policy "activity_insert" on daily_activity for insert with check (user_id = auth.uid());
create policy "activity_update" on daily_activity for update using (user_id = auth.uid());

-- 4. Триггер: auto-create profile + progress при регистрации

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

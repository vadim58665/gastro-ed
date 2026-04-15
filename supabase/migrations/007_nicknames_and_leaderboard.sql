-- 007: nicknames in profiles + daily_case_results leaderboard table.
-- - Adds nickname (unique, case-insensitive) and phone columns to profiles.
-- - Creates daily_case_results (one row per user/day) feeding the daily leaderboard.
-- - RLS: any authenticated user can SELECT leaderboard rows; writes only on own row.
-- - public_profiles VIEW exposes only {id, nickname} for safe JOINs without leaking email.

-- 1. Profiles: nickname + phone
alter table profiles
  add column if not exists nickname text,
  add column if not exists phone text;

-- 2. Case-insensitive unique nickname (NULL allowed for legacy users)
create unique index if not exists profiles_nickname_ci_unique
  on profiles (lower(nickname))
  where nickname is not null;

-- 3. Nickname format: 3-20 chars, [a-z0-9_]
alter table profiles
  drop constraint if exists profiles_nickname_format;
alter table profiles
  add constraint profiles_nickname_format
  check (nickname is null or nickname ~ '^[a-z0-9_]{3,20}$');

-- 4. Daily case results
create table if not exists daily_case_results (
  user_id uuid not null references profiles(id) on delete cascade,
  case_date date not null,
  case_id text not null,
  total_points int not null check (total_points >= 0),
  max_points int not null check (max_points > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, case_date)
);

-- 5. Leaderboard index (filter by date, sort by points desc)
create index if not exists idx_daily_case_results_leaderboard
  on daily_case_results (case_date, total_points desc);

-- 6. RLS
alter table daily_case_results enable row level security;

drop policy if exists "daily_case_results_select_authenticated" on daily_case_results;
create policy "daily_case_results_select_authenticated"
  on daily_case_results for select
  to authenticated
  using (true);

drop policy if exists "daily_case_results_insert_self" on daily_case_results;
create policy "daily_case_results_insert_self"
  on daily_case_results for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily_case_results_update_self" on daily_case_results;
create policy "daily_case_results_update_self"
  on daily_case_results for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 7. public_profiles VIEW — for leaderboard JOIN without exposing email.
create or replace view public_profiles as
  select id, nickname from profiles where nickname is not null;

grant select on public_profiles to authenticated;

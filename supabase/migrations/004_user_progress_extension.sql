-- Extend user_progress to match the TS UserProgress type in src/types/user.ts.
-- These fields are already produced client-side (xp/level gamification,
-- FSRS-style cardHistory, achievements, dailyCaseHistory, topicsAnswered)
-- and actively read across 8+ files, but sync.ts never round-tripped them.
-- Result: every cross-device login silently wiped the richer state.

alter table user_progress
  add column if not exists xp integer not null default 0,
  add column if not exists level integer not null default 1,
  add column if not exists unlocked_achievements jsonb not null default '{}'::jsonb,
  add column if not exists completed_challenge_ids jsonb not null default '[]'::jsonb,
  add column if not exists card_history jsonb not null default '{}'::jsonb,
  add column if not exists daily_goal_streak integer not null default 0,
  add column if not exists daily_goal_streak_best integer not null default 0,
  add column if not exists perfect_blitz_count integer not null default 0,
  add column if not exists type_counts jsonb not null default '{}'::jsonb,
  add column if not exists topics_answered jsonb not null default '[]'::jsonb,
  add column if not exists daily_case_history jsonb not null default '{}'::jsonb;

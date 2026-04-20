-- Adds the `recent_answers` column that `src/lib/supabase/sync.ts` already
-- writes on every progress sync. Without this column Supabase returns 400
-- "Could not find the 'recent_answers' column of 'user_progress' in the
-- schema cache", flooding the console and silently skipping cloud sync.
--
-- Matches the TS shape in src/types/user.ts (UserProgress.recentAnswers:
-- Array<{ cardId, isCorrect, timestamp }>). Default '[]' keeps the NOT NULL
-- contract for existing rows.

alter table user_progress
  add column if not exists recent_answers jsonb not null default '[]'::jsonb;

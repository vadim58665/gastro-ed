-- RLS hardening: add WITH CHECK to all UPDATE policies on 001_initial tables.
-- Without WITH CHECK, an authenticated user could UPDATE their own row and
-- reassign user_id/id to a different user. Postgres treats the USING clause
-- as a pre-update visibility filter only.
--
-- Tables touched: profiles, user_progress, review_cards, daily_activity.
-- (user_answers has no UPDATE policy — append-only log, nothing to patch.)

-- profiles.profiles_update
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- user_progress.progress_update
drop policy if exists "progress_update" on user_progress;
create policy "progress_update" on user_progress
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- review_cards.review_update
drop policy if exists "review_update" on review_cards;
create policy "review_update" on review_cards
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- daily_activity.activity_update
drop policy if exists "activity_update" on daily_activity;
create policy "activity_update" on daily_activity
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

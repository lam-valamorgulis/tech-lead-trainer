-- Year goals and the Later list (ticket #30, spec stories 22 and 71, design 14 rule 5).
-- Neither is an event table: they hold the learner's own choices, not learning history.

-- The 2 year goals the learner checks by hand. "12 badges" is never stored: the app checks it
-- from the Gym results, so it can never disagree with the badges.
-- One row per learner and goal. An untick keeps the row with checked = false.
create table public.year_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal text not null check (goal in ('interview-tower', 'champion-project')),
  checked boolean not null,
  changed_at timestamptz not null default now(),
  primary key (user_id, goal)
);

alter table public.year_goals enable row level security;

create policy "Owner can read own year goals" on public.year_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own year goals" on public.year_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own year goals" on public.year_goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own year goals" on public.year_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

-- A tick is an upsert, which sets every column it sends. A learner never deletes a row.
revoke update, delete, truncate on public.year_goals from anon, authenticated;
grant update (goal, checked, changed_at) on public.year_goals to authenticated;

-- The Later list: a new goal from the middle of the year is parked here, instead of starting
-- a new plan (design 14 rule 5). Remove only hides a goal: its text stays, so nothing is lost
-- by a wrong tap. A learner cannot edit the text after adding it.
create table public.later_goals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (text = btrim(text) and char_length(text) between 1 and 200),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create index later_goals_user on public.later_goals (user_id, created_at);

alter table public.later_goals enable row level security;

create policy "Owner can read own later goals" on public.later_goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own later goals" on public.later_goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own later goals" on public.later_goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own later goals" on public.later_goals
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.later_goals from anon, authenticated;
grant update (removed_at) on public.later_goals to authenticated;

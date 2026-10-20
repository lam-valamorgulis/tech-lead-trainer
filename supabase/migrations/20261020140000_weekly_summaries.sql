-- Weekly summaries (ticket #23, design 3 and 12.2). One row per learner per week: the Sunday
-- summary, saved as it was shown. Its numbers never change after the row is made, even when
-- content is renamed or a late event arrives (design 12.2: "Tóm tắt Chủ nhật ... ảnh chụp").
--
-- The server makes the row for the week that ended on Sunday at 20:00 home time. It counts
-- only events from before that moment (`summary_at`). Two runs at the same moment make one
-- row: the unique key below, and the server inserts with "on conflict do nothing".

create table public.weekly_summaries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The Monday learning day the week starts on.
  week_start date not null check (extract(isodow from week_start) = 1),
  -- Sunday 20:00 home time. The summary counts what happened before this moment.
  summary_at timestamptz not null,
  created_at timestamptz not null default now(),
  days_learned smallint not null check (days_learned between 0 and 7),
  minutes integer not null check (minutes between 0 and 10080),
  -- The weekly goal at the time, so a later goal change leaves old weeks alone.
  goal_minutes smallint not null check (goal_minutes > 0),
  -- The best-move rate of the week's battle turns (ticket #17).
  best_moves integer not null check (best_moves >= 0),
  best_move_turns integer not null check (best_move_turns >= best_moves),
  -- Up to 3 creatures as [{"id": ..., "name": ...}], with the names as they were shown.
  weakest_creatures jsonb not null check (jsonb_typeof(weakest_creatures) = 'array' and jsonb_array_length(weakest_creatures) <= 3),
  unique (user_id, week_start)
);

alter table public.weekly_summaries enable row level security;

create policy "Owner can read own weekly summaries" on public.weekly_summaries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own weekly summaries" on public.weekly_summaries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own weekly summaries" on public.weekly_summaries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own weekly summaries" on public.weekly_summaries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The grants decide who writes: only the server.
revoke insert, update, delete, truncate on public.weekly_summaries from anon, authenticated;

-- A saved summary never changes, not even with the secret key. Deleting the account still
-- removes it (the cascade above), and a restore inserts it again as it was.
create function private.refuse_weekly_summary_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'a weekly summary never changes after it is saved' using errcode = '42501';
end;
$$;

create trigger weekly_summaries_never_change
before update on public.weekly_summaries
for each row execute function private.refuse_weekly_summary_change();

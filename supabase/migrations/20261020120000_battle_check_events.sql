-- Self-check events (ticket #17, design 7.7 and 12.2). Same event pattern as battle_turn_events.
-- After each turn's result the learner reads the model answer and ticks the key points they said.
-- The ticks change only the review schedule, never the damage or the result of the battle.
-- The turn's best move is stored at play time, so a later content edit never changes the history.

create function private.has_no_repeats(points smallint[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select count(*) = count(distinct point) from unnest(points) as point
$$;

create table public.battle_check_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  battle_id uuid not null,
  scenario_id text not null check (scenario_id ~ '^t[0-9]{2}-[a-z0-9-]+$'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{16}$'),
  turn_number smallint not null check (turn_number between 1 and 3),
  best_move_id text not null check (char_length(best_move_id) between 1 and 100),
  -- The key points the learner said: each of 1, 2 and 3 at most once. Empty when none.
  ticked_points smallint[] not null check (
    ticked_points <@ '{1,2,3}'::smallint[]
    and cardinality(ticked_points) <= 3
    and private.has_no_repeats(ticked_points)
  ),
  unique (user_id, client_event_id),
  -- Each turn is checked once. A second device that checks it later is refused.
  unique (user_id, battle_id, turn_number)
);

create index battle_check_events_user_best_move on public.battle_check_events (user_id, best_move_id);

create trigger battle_check_events_set_learning_day
before insert on public.battle_check_events
for each row execute function private.set_learning_day();

alter table public.battle_check_events enable row level security;

create policy "Owner can read own battle check events" on public.battle_check_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own battle check events" on public.battle_check_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own battle check events" on public.battle_check_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own battle check events" on public.battle_check_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.battle_check_events from anon, authenticated;

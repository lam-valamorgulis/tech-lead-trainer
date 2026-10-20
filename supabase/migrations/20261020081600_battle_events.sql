-- Battle events (ticket #16, design 7 and 12.2). Same event pattern as session_events.
-- One row per played turn, and one row when a battle ends. A battle left unfinished has turns
-- and no end row. Whether a move was the best one is stored at play time and never recomputed.

create table public.battle_turn_events (
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
  -- Null when the team had no move for this threat.
  move_id text check (char_length(move_id) <= 100),
  damage smallint not null check (damage between 0 and 2),
  best_move boolean not null,
  why_text text not null check (char_length(btrim(why_text)) between 1 and 1000),
  unique (user_id, client_event_id),
  -- Each turn is played once. A second device that plays it later is refused.
  unique (user_id, battle_id, turn_number)
);

create index battle_turn_events_user_day on public.battle_turn_events (user_id, learning_day);

create trigger battle_turn_events_set_learning_day
before insert on public.battle_turn_events
for each row execute function private.set_learning_day();

alter table public.battle_turn_events enable row level security;

create policy "Owner can read own battle turn events" on public.battle_turn_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own battle turn events" on public.battle_turn_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own battle turn events" on public.battle_turn_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own battle turn events" on public.battle_turn_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.battle_turn_events from anon, authenticated;

create table public.battle_events (
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
  -- Up to 3 caught creatures. A learner with fewer caught creatures brings all of them.
  -- At most 3 names, so checking the first 3 positions checks every name.
  team text[] not null check (
    cardinality(team) between 1 and 3
    and coalesce(char_length(team[1]), 0) <= 100
    and coalesce(char_length(team[2]), 0) <= 100
    and coalesce(char_length(team[3]), 0) <= 100
  ),
  result text not null check (result in ('won', 'lost')),
  turns_used smallint not null check (turns_used between 1 and 3),
  unique (user_id, client_event_id),
  -- A battle ends once.
  unique (user_id, battle_id)
);

create trigger battle_events_set_learning_day
before insert on public.battle_events
for each row execute function private.set_learning_day();

alter table public.battle_events enable row level security;

create policy "Owner can read own battle events" on public.battle_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own battle events" on public.battle_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own battle events" on public.battle_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own battle events" on public.battle_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.battle_events from anon, authenticated;

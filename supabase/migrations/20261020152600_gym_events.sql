-- Gym events (ticket #26, design 4 and 5). Same event pattern as session_events.
-- One row when a Gym ends: after 5 battles, or once 2 losses put the badge out of reach.
-- Its battles are stored as normal battle events. A badge is any passed Gym of a town.

create table public.gym_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  gym_id uuid not null,
  town_id text not null check (town_id ~ '^t[0-9]{2}$'),
  battle_ids uuid[] not null check (cardinality(battle_ids) between 1 and 5),
  wins smallint not null check (wins between 0 and 5 and wins <= cardinality(battle_ids)),
  -- 4 wins give the badge.
  passed boolean not null check (passed = (wins >= 4)),
  unique (user_id, client_event_id),
  -- A Gym ends once.
  unique (user_id, gym_id)
);

create trigger gym_events_set_learning_day
before insert on public.gym_events
for each row execute function private.set_learning_day();

alter table public.gym_events enable row level security;

create policy "Owner can read own gym events" on public.gym_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own gym events" on public.gym_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own gym events" on public.gym_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own gym events" on public.gym_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.gym_events from anon, authenticated;

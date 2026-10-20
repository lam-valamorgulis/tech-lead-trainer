-- "Discuss in Claude" and the teach-back (ticket #19, design 10 and 12.2). Same event pattern as
-- battle_check_events. Design 12.2 asks the battle log to know whether "Discuss in Claude" was
-- tapped, and to keep the 2 sentences the learner wrote from memory after the chat.

-- One row per tap on "Discuss in Claude". `copied` is false when the clipboard write failed and
-- the app showed the text box for a manual copy.
create table public.battle_discuss_events (
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
  copied boolean not null,
  unique (user_id, client_event_id)
);

create trigger battle_discuss_events_set_learning_day
before insert on public.battle_discuss_events
for each row execute function private.set_learning_day();

alter table public.battle_discuss_events enable row level security;

create policy "Owner can read own battle discuss events" on public.battle_discuss_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own battle discuss events" on public.battle_discuss_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own battle discuss events" on public.battle_discuss_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own battle discuss events" on public.battle_discuss_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.battle_discuss_events from anon, authenticated;

-- The 2 teach-back sentences of a battle. `item_ids` are the review items they come back at: the
-- best move of each played turn and its creature, fixed when the sentences are saved, so a later
-- content edit never moves them to another item.
create table public.battle_teach_back_events (
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
  -- At most 3 turns, each with a best move and its creature. Checking the first 6 positions
  -- checks every id.
  item_ids text[] not null check (
    cardinality(item_ids) between 1 and 6
    and coalesce(char_length(item_ids[1]), 0) <= 100
    and coalesce(char_length(item_ids[2]), 0) <= 100
    and coalesce(char_length(item_ids[3]), 0) <= 100
    and coalesce(char_length(item_ids[4]), 0) <= 100
    and coalesce(char_length(item_ids[5]), 0) <= 100
    and coalesce(char_length(item_ids[6]), 0) <= 100
  ),
  first_sentence text not null check (char_length(btrim(first_sentence)) between 1 and 500),
  second_sentence text not null check (char_length(btrim(second_sentence)) between 1 and 500),
  unique (user_id, client_event_id),
  -- A battle has one teach-back. A second device that sends another later is refused.
  unique (user_id, battle_id)
);

create trigger battle_teach_back_events_set_learning_day
before insert on public.battle_teach_back_events
for each row execute function private.set_learning_day();

alter table public.battle_teach_back_events enable row level security;

create policy "Owner can read own battle teach-back events" on public.battle_teach_back_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own battle teach-back events" on public.battle_teach_back_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own battle teach-back events" on public.battle_teach_back_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own battle teach-back events" on public.battle_teach_back_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.battle_teach_back_events from anon, authenticated;

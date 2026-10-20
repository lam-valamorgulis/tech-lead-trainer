-- Read-close-write (ticket #34, design 3: the 45-minute day). Same event pattern as session_events.
-- One row when the learner saves the 3 points they recall after closing a primary source.

create table public.reading_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  -- The creature or move whose card cites the source.
  item_id text not null check (char_length(item_id) <= 100),
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 2000),
  -- Exactly 3 points, none empty, each at most 500 characters.
  points text[] not null check (
    cardinality(points) = 3
    and char_length(btrim(points[1])) between 1 and 500
    and char_length(btrim(points[2])) between 1 and 500
    and char_length(btrim(points[3])) between 1 and 500
  ),
  unique (user_id, client_event_id)
);

create index reading_events_user_item on public.reading_events (user_id, item_id);

create trigger reading_events_set_learning_day
before insert on public.reading_events
for each row execute function private.set_learning_day();

alter table public.reading_events enable row level security;

create policy "Owner can read own reading events" on public.reading_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own reading events" on public.reading_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own reading events" on public.reading_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own reading events" on public.reading_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.reading_events from anon, authenticated;

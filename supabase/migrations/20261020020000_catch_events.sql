-- Catch events (ticket #6, design 6 and 12.2). Same event pattern as session_events.
-- One row per answer: before the card, and once more after the card when the first was wrong.

create table public.catch_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  item_id text not null check (char_length(item_id) <= 100),
  item_kind text not null check (item_kind in ('creature', 'move')),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{16}$'),
  answer_text text not null check (char_length(answer_text) <= 500),
  correct boolean not null,
  -- 1 = guess, 2 = think so, 3 = sure.
  confidence smallint not null check (confidence between 1 and 3),
  phase text not null check (phase in ('before-card', 'after-card')),
  unique (user_id, client_event_id)
);

create index catch_events_user_item on public.catch_events (user_id, item_id);

create trigger catch_events_set_learning_day
before insert on public.catch_events
for each row execute function private.set_learning_day();

alter table public.catch_events enable row level security;

create policy "Owner can read own catch events" on public.catch_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own catch events" on public.catch_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own catch events" on public.catch_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own catch events" on public.catch_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.catch_events from anon, authenticated;

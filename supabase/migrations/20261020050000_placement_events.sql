-- Placement answers (ticket #13, design 4 and 6). Same event pattern as session_events.
-- The learner checks a short answer against the model answer. A right answer catches the
-- creature at stage 1.

create table public.placement_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  town_id text not null check (town_id ~ '^t[0-9]{2}$'),
  item_id text not null check (char_length(item_id) <= 100),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{16}$'),
  answer_text text not null check (char_length(answer_text) <= 2000),
  correct boolean not null,
  -- 1 = guess, 2 = think so, 3 = sure.
  confidence smallint not null check (confidence between 1 and 3),
  unique (user_id, client_event_id)
);

create index placement_events_user_town on public.placement_events (user_id, town_id);

create trigger placement_events_set_learning_day
before insert on public.placement_events
for each row execute function private.set_learning_day();

alter table public.placement_events enable row level security;

create policy "Owner can read own placement events" on public.placement_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own placement events" on public.placement_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own placement events" on public.placement_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own placement events" on public.placement_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.placement_events from anon, authenticated;

-- Review events (ticket #7, design 6 and 12.2). Same event pattern as session_events.
-- Every field the month-3 check needs (design 15): steps, grade, planned due day, and the
-- times the question was shown, revealed and graded. A grade 1 second after Reveal is visible.

create table public.review_events (
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
  -- Steps are in days: 1, 3, 7, 14, 30, 90 or 180.
  step_before smallint not null check (step_before in (1, 3, 7, 14, 30, 90, 180)),
  step_after smallint not null check (step_after in (1, 3, 7, 14, 30, 90, 180)),
  grade text not null check (grade in ('again', 'hard', 'good', 'easy')),
  planned_due_day date not null,
  shown_at timestamptz not null,
  revealed_at timestamptz not null,
  graded_at timestamptz not null,
  typed_answer text check (char_length(typed_answer) <= 2000),
  confidence smallint check (confidence between 1 and 3),
  unique (user_id, client_event_id)
);

create index review_events_user_item on public.review_events (user_id, item_id);

create trigger review_events_set_learning_day
before insert on public.review_events
for each row execute function private.set_learning_day();

alter table public.review_events enable row level security;

create policy "Owner can read own review events" on public.review_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own review events" on public.review_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own review events" on public.review_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own review events" on public.review_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.review_events from anon, authenticated;

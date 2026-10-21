-- The Feedback button (ticket #95, design 9 rule 15): a learner's note about any screen.
-- Like "Report wrong", not an event table: the owner's weekly run moves a note from open to done.

create table public.feedback_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The screen the note was written on, as a short slug: home, session, map, field-guide …
  -- A new screen needs no migration.
  screen text not null check (screen ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(screen) <= 40),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'done'))
);

create index feedback_notes_status on public.feedback_notes (status, screen);

alter table public.feedback_notes enable row level security;

create policy "Owner can read own feedback" on public.feedback_notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create own feedback" on public.feedback_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own feedback" on public.feedback_notes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own feedback" on public.feedback_notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The grants decide what a learner may do: write a note
-- and read it back, nothing more. Only the server key changes the status.
revoke update, delete, truncate on public.feedback_notes from anon, authenticated;

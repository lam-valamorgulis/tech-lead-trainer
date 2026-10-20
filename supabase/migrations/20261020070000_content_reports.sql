-- "Report wrong" (ticket #15, design 12.3): one tap saves which item looked wrong.
-- Not an event table: the status moves from open to done after the owner fixes the content.

create table public.content_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  item_id text not null check (char_length(item_id) <= 100),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{16}$'),
  -- Where the learner saw it. Battles add 'battle' later.
  screen text not null check (screen in ('catch-card', 'review')),
  message text check (char_length(message) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'done'))
);

create index content_reports_status on public.content_reports (status, item_id);

alter table public.content_reports enable row level security;

create policy "Owner can read own reports" on public.content_reports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create own reports" on public.content_reports
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own reports" on public.content_reports
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own reports" on public.content_reports
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Review state (ticket #8, design 12.2): a cache, not a source of truth.
-- The event endpoint keeps it up to date. `npm run rebuild:review-state` recomputes it from
-- catch_events and review_events, and must always give the same rows.

create table public.review_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null check (char_length(item_id) <= 100),
  step smallint not null check (step in (1, 3, 7, 14, 30, 90, 180)),
  -- Empty when the reviews of the item have ended.
  due_day date,
  caught_day date not null,
  stage smallint not null check (stage between 1 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.review_state enable row level security;

create policy "Owner can read own review state" on public.review_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create own review state" on public.review_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own review state" on public.review_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own review state" on public.review_state
  for delete to authenticated using ((select auth.uid()) = user_id);

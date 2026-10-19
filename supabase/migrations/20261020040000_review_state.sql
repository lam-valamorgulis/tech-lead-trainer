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
  -- How many catch and review events of the item this row was built from. The log only grows,
  -- so a row built from fewer events is older.
  event_count integer not null check (event_count >= 1),
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

-- Saves the signed-in user's states, but never over a row built from more events.
-- Two devices that save at the same time cannot leave an older state behind.
create function public.save_review_state(states jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into public.review_state (user_id, item_id, step, due_day, caught_day, stage, event_count, updated_at)
  select (select auth.uid()), s.item_id, s.step, s.due_day, s.caught_day, s.stage, s.event_count, now()
  from jsonb_to_recordset(states)
    as s (item_id text, step smallint, due_day date, caught_day date, stage smallint, event_count integer)
  on conflict (user_id, item_id) do update
    set step = excluded.step,
        due_day = excluded.due_day,
        caught_day = excluded.caught_day,
        stage = excluded.stage,
        event_count = excluded.event_count,
        updated_at = excluded.updated_at
    where public.review_state.event_count <= excluded.event_count
$$;

revoke execute on function public.save_review_state(jsonb) from public, anon;
grant execute on function public.save_review_state(jsonb) to authenticated;

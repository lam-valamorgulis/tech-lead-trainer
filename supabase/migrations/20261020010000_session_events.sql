-- Session events (ticket #5, design 12.2). The first event table, so it sets the event pattern:
--
-- - Append-only: signed-in users can add rows, never change or delete them.
-- - Every row has the user, the real time with time zone, the learning day, the session,
--   and a client event id. The same client event id twice gives one row.
-- - The server sets the learning day from the home time zone. The app cannot choose it.
--
-- A session writes one snapshot when it starts and one every 60 seconds after that.
-- The latest snapshot has the session's active seconds and its last seen time.

-- Sets learning_day from the user's profile. Every event table uses this trigger.
create function private.set_learning_day()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  home record;
begin
  if new.occurred_at > now() + interval '10 minutes' then
    raise exception 'occurred_at % is in the future', new.occurred_at using errcode = '22023';
  end if;
  select p.home_time_zone, p.day_cutoff_hour into home from public.profiles p where p.user_id = new.user_id;
  if not found then
    raise exception 'no profile for this user' using errcode = '23503';
  end if;
  new.learning_day := private.learning_day(new.occurred_at, home.home_time_zone, home.day_cutoff_hour);
  return new;
end;
$$;

create table public.session_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  committed_minutes smallint not null check (committed_minutes in (3, 15, 45)),
  active_seconds integer not null check (active_seconds between 0 and 86400),
  device text not null check (char_length(device) <= 100),
  unique (user_id, client_event_id)
);

create index session_events_user_day on public.session_events (user_id, learning_day);

create trigger session_events_set_learning_day
before insert on public.session_events
for each row execute function private.set_learning_day();

alter table public.session_events enable row level security;

create policy "Owner can read own session events" on public.session_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own session events" on public.session_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own session events" on public.session_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own session events" on public.session_events
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The grants make the log append-only.
revoke update, delete, truncate on public.session_events from anon, authenticated;

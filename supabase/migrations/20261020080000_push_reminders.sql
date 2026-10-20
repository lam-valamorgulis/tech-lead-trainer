-- Push subscriptions and the morning reminder (ticket #20, design 12.4).
--
-- How a reminder travels: `pg_cron` runs every 5 minutes on database time (UTC) and calls one
-- app endpoint with the cron secret. The app decides for each user, in the home time zone,
-- whether a reminder is due, and sends it with `web-push`. No local time is ever written into
-- the cron schedule.

-- One row per device that turned on reminders. Not an event table: a row goes away when the
-- learner turns reminders off, or when the push service says the device is gone.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  device text not null check (char_length(device) <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Owner can read own push subscriptions" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own push subscriptions" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own push subscriptions" on public.push_subscriptions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Planned and sent reminders. The unique key is the guard of design 12.4: at most one reminder
-- per user, learning day and kind. The server claims the row before it sends, so two timer runs
-- at the same moment still send one reminder. The evening kind is for ticket #21.
create table public.reminders (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  learning_day date not null,
  kind text not null check (kind in ('morning', 'evening')),
  planned_at timestamptz not null default now(),
  sent_at timestamptz,
  -- How many devices the push service accepted the reminder for.
  delivered smallint not null default 0 check (delivered >= 0),
  unique (user_id, learning_day, kind)
);

alter table public.reminders enable row level security;

create policy "Owner can read own reminders" on public.reminders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own reminders" on public.reminders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own reminders" on public.reminders
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own reminders" on public.reminders
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The grants decide who writes: only the server.
revoke insert, update, delete, truncate on public.reminders from anon, authenticated;

-- The 5-minute timer.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Calls the notify endpoint. The endpoint URL and the cron secret live in Supabase Vault, never
-- in git. Until the owner stores them (scripts/setup-reminders.sh), the call does nothing.
-- Returns the pg_net request id, or null when nothing was sent.
create function private.request_reminders()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  notify_url text;
  cron_secret text;
begin
  select s.decrypted_secret into notify_url from vault.decrypted_secrets s where s.name = 'reminders_notify_url';
  select s.decrypted_secret into cron_secret from vault.decrypted_secrets s where s.name = 'reminders_cron_secret';
  if notify_url is null or cron_secret is null then
    return null;
  end if;
  return net.http_post(
    url := notify_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 30000
  );
end;
$$;

-- It reads the Vault, so only the database owner and the timer may run it.
revoke execute on function private.request_reminders() from public, anon, authenticated, service_role;

select cron.schedule('reminders-notify', '*/5 * * * *', 'select private.request_reminders()');

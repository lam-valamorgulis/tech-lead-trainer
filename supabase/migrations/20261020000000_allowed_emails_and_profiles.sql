-- Sign-in and profiles (ticket #3, design section 12.5).
--
-- The pattern every table follows: a `user_id` column that defaults to the signed-in user,
-- row-level security on, and four owner-only policies (select, insert, update, delete).
-- `allowed_emails` is the one exception: only the server (service role) reads it.

-- Helpers that triggers use. The API does not serve this schema, so the browser cannot call them.
create schema private;
grant usage on schema private to authenticated, service_role;

-- The learning day: the date in the home time zone after moving back by the cutoff hour.
-- 00:30 in Ho Chi Minh City with cutoff 4 still counts for the day before (design 12.4).
create function private.learning_day(at timestamptz, time_zone text, cutoff_hour smallint)
returns date
language sql
immutable
strict
set search_path = ''
as $$
  select ((at at time zone time_zone) - make_interval(hours => cutoff_hour))::date
$$;

create function private.is_time_zone(name text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform now() at time zone name;
  return true;
exception when others then
  return false;
end;
$$;

create table public.allowed_emails (
  email text primary key check (email = lower(btrim(email))),
  added_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No policies on purpose: signed-in users and visitors cannot read or change the allow list.
revoke all on public.allowed_emails from anon, authenticated;

-- Removing an email from the list blocks its account, so it cannot sign in again even by
-- calling Supabase directly. Adding the email back lets it sign in again. No data is deleted.
create function private.sync_account_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- GoTrue cannot read 'infinity', so the block lasts 100 years.
    update auth.users set banned_until = now() + interval '100 years' where lower(email) = old.email;
    return old;
  end if;
  update auth.users set banned_until = null where lower(email) = new.email;
  return new;
end;
$$;

create trigger allowed_emails_sync_account_access
after insert or delete on public.allowed_emails
for each row execute function private.sync_account_access();

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  home_time_zone text not null default 'Asia/Ho_Chi_Minh' check (private.is_time_zone(home_time_zone)),
  day_cutoff_hour smallint not null default 4 check (day_cutoff_hour between 0 and 23),
  morning_reminder_time time not null default '07:30',
  evening_reminder_time time not null default '20:00',
  plain_font boolean not null default false,
  reduce_effects boolean not null default false,
  sound_on boolean not null default true,
  if_then_plan text,
  tired_day_plan text,
  program_start_date date not null,
  created_at timestamptz not null default now()
);

-- Day 1 of the program is the learning day of the first sign-in, in the home time zone.
-- A signed-in user can never choose or change it. The server (for example a restore) can.
create function private.set_program_start_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if auth.role() = 'authenticated' then
      new.program_start_date := old.program_start_date;
    end if;
  elsif new.program_start_date is null or auth.role() = 'authenticated' then
    new.program_start_date := private.learning_day(now(), new.home_time_zone, new.day_cutoff_hour);
  end if;
  return new;
end;
$$;

create trigger profiles_set_program_start_date
before insert or update on public.profiles
for each row execute function private.set_program_start_date();

alter table public.profiles enable row level security;

create policy "Owner can read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own profile" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

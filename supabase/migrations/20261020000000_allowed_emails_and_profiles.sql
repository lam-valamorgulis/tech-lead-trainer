-- Sign-in and profiles (ticket #3, design section 12.5).
--
-- The pattern every table follows: a `user_id` column that defaults to the signed-in user,
-- row-level security on, and four owner-only policies (select, insert, update, delete).
-- `allowed_emails` is the one exception: only the server (service role) reads it.

-- The learning day: the date in the home time zone after moving back by the cutoff hour.
-- 00:30 in Ho Chi Minh City with cutoff 4 still counts for the day before (design 12.4).
create function public.learning_day(at timestamptz, time_zone text, cutoff_hour smallint)
returns date
language sql
immutable
strict
set search_path = ''
as $$
  select ((at at time zone time_zone) - make_interval(hours => cutoff_hour))::date
$$;

create table public.allowed_emails (
  email text primary key check (email = lower(btrim(email))),
  added_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;
-- No policies on purpose: signed-in users and visitors cannot read or change the allow list.
revoke all on public.allowed_emails from anon, authenticated;

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  home_time_zone text not null default 'Asia/Ho_Chi_Minh',
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
create function public.set_program_start_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.program_start_date is null then
    new.program_start_date := public.learning_day(now(), new.home_time_zone, new.day_cutoff_hour);
  end if;
  return new;
end;
$$;

create trigger profiles_set_program_start_date
before insert on public.profiles
for each row execute function public.set_program_start_date();

alter table public.profiles enable row level security;

create policy "Owner can read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can create own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own profile" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Weekly backups (ticket #22, design 12.6). One row per learner per backup that was stored
-- safely: "this learner's data is in this file". Settings shows the newest one as "Last backup".
-- The weekly job adds the rows only after the encrypted file is stored, so a failed week adds
-- nothing: Settings keeps showing the old date, and the problem is visible.

create table public.backups (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null check (file_name ~ '^backup-\d{4}-\d{2}-\d{2}T\d{6}Z\.tltb$'),
  finished_at timestamptz not null default now(),
  unique (user_id, file_name)
);

create index backups_user_finished on public.backups (user_id, finished_at desc);

alter table public.backups enable row level security;

create policy "Owner can read own backups" on public.backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own backups" on public.backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own backups" on public.backups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own backups" on public.backups
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The grants decide who writes: only the server.
revoke insert, update, delete, truncate on public.backups from anon, authenticated;

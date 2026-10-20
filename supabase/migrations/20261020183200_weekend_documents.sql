-- Weekend documents (ticket #32, design 3 and spec "Weekend documents"): the boss design doc of
-- each town. Not an event table: the learner keeps editing it, and the app saves it as they type.

create table public.weekend_documents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- <town>-boss, for example t01-boss. The ADR document (#33) adds its own kind.
  document_key text not null check (document_key ~ '^t[0-9]{2}-boss$'),
  kind text not null default 'boss' check (kind in ('boss')),
  problem text not null default '' check (char_length(problem) <= 20000),
  options text not null default '' check (char_length(options) <= 20000),
  decision text not null default '' check (char_length(decision) <= 20000),
  trade_offs text not null default '' check (char_length(trade_offs) <= 20000),
  risks text not null default '' check (char_length(risks) <= 20000),
  diagram text not null default '' check (char_length(diagram) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_key)
);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger weekend_documents_touch_updated_at
before update on public.weekend_documents
for each row execute function private.touch_updated_at();

alter table public.weekend_documents enable row level security;

create policy "Owner can read own weekend documents" on public.weekend_documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own weekend documents" on public.weekend_documents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own weekend documents" on public.weekend_documents
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own weekend documents" on public.weekend_documents
  for delete to authenticated using ((select auth.uid()) = user_id);

-- The policies follow the table pattern. The app never deletes a document.
revoke delete, truncate on public.weekend_documents from anon, authenticated;

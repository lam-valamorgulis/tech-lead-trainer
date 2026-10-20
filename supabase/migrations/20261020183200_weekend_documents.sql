-- Weekend documents (ticket #32, design 3 and spec "Weekend documents"): the learner's weekend
-- writing, one row per document. Not an event table: the learner keeps editing it, and the app
-- saves it as they type. Week 1 is the boss design doc. The ADR (#33) uses the same table.

create table public.weekend_documents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- <town>-<kind>, for example t01-boss.
  document_key text not null check (document_key ~ '^t[0-9]{2}-(boss|adr)$'),
  kind text not null check (kind in ('boss', 'adr') and document_key like '%-' || kind),
  -- The parts of the document by name, for example {"problem": "...", "risks": "..."}.
  sections jsonb not null default '{}'::jsonb
    check (jsonb_typeof(sections) = 'object' and octet_length(sections::text) <= 100000),
  -- The Mermaid source of the diagram.
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

-- The policies follow the table pattern. The grants decide what a learner may change: a save is
-- an upsert of the key, the kind and the text. The app never deletes a document.
revoke update, delete, truncate on public.weekend_documents from anon, authenticated;
grant update (document_key, kind, sections, diagram) on public.weekend_documents to authenticated;

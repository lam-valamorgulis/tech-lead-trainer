-- The weekend ADR (ticket #33, design 3 week 2): a date to check the real outcome 4 to 8 weeks
-- later, a reminder on that date, and "a colleague read this" on every weekend document.

alter table public.weekend_documents
  add column outcome_check_date date,
  add column colleague_read boolean not null default false,
  -- Only an ADR has an outcome to check.
  add constraint weekend_documents_outcome_only_adr check (outcome_check_date is null or kind = 'adr');

grant update (outcome_check_date, colleague_read) on public.weekend_documents to authenticated;

-- The outcome reminder is its own kind, so it never takes the place of the daily reminder.
alter table public.reminders drop constraint reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check check (kind in ('morning', 'evening', 'adr-outcome'));

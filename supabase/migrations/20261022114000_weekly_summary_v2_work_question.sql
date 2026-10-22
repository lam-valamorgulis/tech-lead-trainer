-- Sunday summary v2 and the work question (ticket #114, design 3, 7.7 and 12.2). Expand only:
-- it adds nullable columns and one new table, and no old row changes.
--
-- 1. weekly_summaries gets the v1.5 numbers. They are filled once, when the row is made, like
--    every other number in it. A row from before v1.5 keeps them all empty, and the app shows it
--    as it was first shown. The never-change trigger still refuses every update.
-- 2. work_question_events logs the answers to "Where did you meet <concept> at work this week?".
--    It follows the event pattern of session_events: one row per answer, never changed.

alter table public.weekly_summaries
  -- The best-move rate of the battle turns that showed a Constraint (constraint_variant is set).
  add column constraint_best_moves integer check (constraint_best_moves >= 0),
  add column constraint_turns integer check (constraint_turns >= constraint_best_moves),
  -- The same rate in the week before, counted up to that week's own Sunday 20:00.
  add column last_week_constraint_best_moves integer check (last_week_constraint_best_moves >= 0),
  add column last_week_constraint_turns integer check (last_week_constraint_turns >= last_week_constraint_best_moves),
  -- Decision Cards (#109) with the right option and the right Reason, of all Decision Cards.
  add column decision_cards_right integer check (decision_cards_right >= 0),
  add column decision_cards integer check (decision_cards >= decision_cards_right),
  add column last_week_decision_cards_right integer check (last_week_decision_cards_right >= 0),
  add column last_week_decision_cards integer check (last_week_decision_cards >= last_week_decision_cards_right),
  -- Up to 3 concepts as [{"id": ..., "name": ...}], with the names as they were shown.
  add column most_missed_concepts jsonb check (
    jsonb_typeof(most_missed_concepts) = 'array' and jsonb_array_length(most_missed_concepts) <= 3
  ),
  -- The concept of the work question as {"id": ..., "name": ...}. Null: the summary asks none.
  add column work_question_concept jsonb check (jsonb_typeof(work_question_concept) = 'object'),
  -- A row has all the v1.5 numbers or none of them. Only a row with them can ask the question.
  add constraint weekly_summaries_v2_shape check (
    num_nulls(
      constraint_best_moves, constraint_turns, last_week_constraint_best_moves, last_week_constraint_turns,
      decision_cards_right, decision_cards, last_week_decision_cards_right, last_week_decision_cards,
      most_missed_concepts
    ) in (0, 9)
    and (work_question_concept is null or most_missed_concepts is not null)
  );

create table public.work_question_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_event_id uuid not null,
  -- The question is answered on home, outside a learning session: each answer gets its own id.
  session_id uuid not null,
  occurred_at timestamptz not null,
  learning_day date not null,
  recorded_at timestamptz not null default now(),
  -- The Monday of the summary's week, as in weekly_summaries.week_start.
  week_start date not null check (extract(isodow from week_start) = 1),
  -- The concept the question named: a creature id, which never changes (design 12.3).
  concept_id text not null check (concept_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(concept_id) <= 100),
  -- False: "Not this week". True: the learner met it at work.
  met boolean not null,
  -- The optional 1 or 2 sentences about where. Only a "met" answer has them, and never blank.
  note text check (note is null or (met and char_length(btrim(note)) between 1 and 500)),
  unique (user_id, client_event_id)
);

-- Home reads the answer of one week.
create index work_question_events_user_week on public.work_question_events (user_id, week_start);

create trigger work_question_events_set_learning_day
before insert on public.work_question_events
for each row execute function private.set_learning_day();

alter table public.work_question_events enable row level security;

create policy "Owner can read own work question events" on public.work_question_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owner can add own work question events" on public.work_question_events
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owner can change own work question events" on public.work_question_events
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owner can delete own work question events" on public.work_question_events
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke update, delete, truncate on public.work_question_events from anon, authenticated;

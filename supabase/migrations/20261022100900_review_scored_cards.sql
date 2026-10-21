-- Decision Cards and the Stage 3 trade-off question in review (ticket #109, design 6.4, 6.5 and 12.2).
-- Expand only: no old row changes, and every old row stays valid. Old rows are creature and move
-- reviews with every review field filled and every new field empty.
--
-- A scored card is a review row of a new item kind:
--   'decision'  — a Decision Card: 2 options, then a Reason. Its id is <creature>.decision.<name>.
--   'trade-off' — the Stage 3 trade-off question: 3 options, then a Reason. Its id is <creature>.trade-off.<name>.
-- The app grades a scored card itself, so it has no grade, no step, no planned due day and no Reveal.
-- Like a battle turn, whether the option and the Reason were right is fixed at play time and never recomputed.

alter table public.review_events drop constraint review_events_item_kind_check;
alter table public.review_events
  add constraint review_events_item_kind_check check (item_kind in ('creature', 'move', 'decision', 'trade-off'));

alter table public.review_events
  alter column step_before drop not null,
  alter column step_after drop not null,
  alter column grade drop not null,
  alter column planned_due_day drop not null,
  alter column revealed_at drop not null,
  -- The option picked, by its index in the content file. A trade-off question has 3 options.
  add column choice_index smallint check (choice_index between 0 and 2),
  add column choice_correct boolean,
  -- The Reason picked, by its index in the content file's list (content/README.md). Exactly 3 Reasons.
  add column reason_index smallint check (reason_index between 0 and 2),
  add column reason_correct boolean,
  -- The Skills the card trains, from the content at play time (design 7.7, Trainer Card).
  -- 1 to 26: the fixed Skill ids of src/content/skills.ts, as in battle_turn_events.
  add column skill_ids smallint[] check (
    cardinality(skill_ids) between 1 and 26
    and array_position(skill_ids, null) is null
    and 1 <= all (skill_ids)
    and 26 >= all (skill_ids)
    and private.has_no_repeats(skill_ids)
  ),
  -- The review rules the row was graded under. Null: before v1.5, when passing the 30-day step
  -- gave Stage 3 by itself. A replay keeps that rule for these rows (design 6.5).
  add column rules_version text check (rules_version in ('v1.5')),
  -- A review card has every review field and no scored-card field. A scored card is the other way round.
  add constraint review_events_shape check (
    case
      when item_kind in ('creature', 'move') then
        step_before is not null and step_after is not null and grade is not null
        and planned_due_day is not null and revealed_at is not null
        and choice_index is null and choice_correct is null
        and reason_index is null and reason_correct is null and skill_ids is null
      else
        step_before is null and step_after is null and grade is null
        and planned_due_day is null and revealed_at is null and typed_answer is null
        and choice_index is not null and choice_correct is not null
        and reason_index is not null and reason_correct is not null and skill_ids is not null
        and shown_at <= graded_at
        -- A Decision Card has 2 options.
        and (item_kind = 'trade-off' or choice_index <= 1)
    end
  );

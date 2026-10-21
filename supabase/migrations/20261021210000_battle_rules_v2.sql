-- Battle rules v2 (ticket #102, design 7 and 12.2, ADR 0001). Expand only: every new column is
-- nullable, no old row changes, and the current Battle screen still writes the old shape.
-- A null in a new column means the turn was played before v2, or its content had no such field.
-- Like best_move, each value is fixed at play time and never recomputed.

alter table public.battle_turn_events
  -- The kind of battle. Null: a turn from before v2, which was always a normal Battle.
  add column battle_kind text check (battle_kind in ('battle', 'meeting', 'agent-diff')),
  -- The Reason the learner picked, by its index in the content file's list (content/README.md).
  -- 0 to 2: a turn has exactly REASONS = 3 Reasons (src/content/schema.ts).
  add column reason_index smallint check (reason_index between 0 and 2),
  add column reason_correct boolean,
  -- The HP the learner's side lost this turn.
  add column hp_lost smallint check (hp_lost between 0 and 2),
  -- The Skills the turn trains, from the content at play time (design 7.7, Trainer Card).
  -- 1 to 26: the fixed Skill ids of src/content/skills.ts. A new Skill needs a new migration.
  add column skill_ids smallint[] check (
    cardinality(skill_ids) between 1 and 26
    and array_position(skill_ids, null) is null
    and 1 <= all (skill_ids)
    and 26 >= all (skill_ids)
    and private.has_no_repeats(skill_ids)
  ),
  -- Which Constraint the turn showed: 'main' is the turn's own line. A Gym may show another (design 7.5).
  add column constraint_variant text check (constraint_variant ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(constraint_variant) <= 50),
  -- A Reason and whether it was right always come together.
  add constraint battle_turn_events_reason_pair check ((reason_index is null) = (reason_correct is null));

-- The typed why is optional from v2 on (ADR 0001). Old rows keep their text. A why that is
-- given must still have words in it: the old check on why_text stays.
alter table public.battle_turn_events alter column why_text drop not null;

alter table public.battle_events
  add column battle_kind text check (battle_kind in ('battle', 'meeting', 'agent-diff')),
  -- How many team members Fainted. Null: a battle from before v2, which had no team HP.
  add column faints smallint check (faints between 0 and 3);

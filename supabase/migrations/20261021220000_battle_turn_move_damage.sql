-- Battle rules v2, part 2 (ticket #102, ADR 0001). Expand only, like 20261021210000_battle_rules_v2.
-- The damage in the move table, before a wrong Reason made the hit 1 weaker. `damage` holds the
-- hit after the Reason, and `hp_lost` can be capped when little HP is left, so the two together
-- cannot always give the table damage back. Null: a turn from before v2, where it equals `damage`.
-- Fixed at play time, like best_move.

alter table public.battle_turn_events
  add column move_damage smallint check (move_damage between 0 and 2);

-- Lesson before the catch question (ticket #97, design 6.3). Expand only: old rows keep their
-- values, and an old-shaped event (before-card or after-card, no attempt) still inserts.
--   after-lesson     the first try, right after the 3 Lesson screens
--   after-look-back  the one more try, after the Lesson screen that holds the answer
-- `attempt` says which try a new row is: 1 or 2. Old rows have none.

alter table public.catch_events drop constraint catch_events_phase_check;
alter table public.catch_events add constraint catch_events_phase_check
  check (phase in ('before-card', 'after-card', 'after-lesson', 'after-look-back'));

alter table public.catch_events add column attempt smallint check (attempt between 1 and 2);

-- A new-flow row always says its try, and it matches the phase. coalesce, because a check on
-- "attempt = 1" passes when attempt is null.
alter table public.catch_events add constraint catch_events_attempt_matches_phase check (
  (phase in ('before-card', 'after-card'))
  or (phase = 'after-lesson' and coalesce(attempt, 0) = 1)
  or (phase = 'after-look-back' and coalesce(attempt, 0) = 2)
);

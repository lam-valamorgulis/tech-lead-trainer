-- If-then plans (ticket #14, design 3). The columns exist since the profiles migration.
-- `if_then_plan` holds the learner's cue, the words after "After": "my morning coffee".
-- `tired_day_plan` holds the whole sentence: "If I am tired, I tap 3."
-- Both show on the commit screen of a phone, so they are 1 to 200 characters.
alter table public.profiles
  add constraint profiles_if_then_plan_length check (char_length(if_then_plan) between 1 and 200),
  add constraint profiles_tired_day_plan_length check (char_length(tired_day_plan) between 1 and 200);

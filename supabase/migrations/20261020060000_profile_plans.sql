-- If-then plans (ticket #14, design 3). The columns exist since the profiles migration;
-- this adds a length limit, because the plans show on the commit screen of a phone.
alter table public.profiles
  add constraint profiles_if_then_plan_length check (char_length(if_then_plan) <= 200),
  add constraint profiles_tired_day_plan_length check (char_length(tired_day_plan) <= 200);

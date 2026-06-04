-- ============================================================================
-- Car out-of-service flag — run ONCE in Supabase → SQL Editor.
-- When TRUE the car is considered damaged / unavailable: it can't be booked and
-- shows greyed-out in the admin fleet list.
-- ============================================================================
alter table public.cars
  add column if not exists damaged boolean not null default false;

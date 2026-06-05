-- ============================================================================
-- Driver licence + second driver fields — run ONCE in Supabase → SQL Editor.
-- ============================================================================
alter table public.unavailable_periods
  add column if not exists licence_number       text,
  add column if not exists second_driver_name   text,
  add column if not exists second_driver_cin    text,
  add column if not exists second_driver_licence text;

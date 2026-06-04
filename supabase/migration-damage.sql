-- ============================================================================
-- Damage flag — run ONCE in Supabase → SQL Editor.
-- Records whether the car came back damaged at the end of a rental. Linked to
-- the reservation's CIN so a client's damage history can be checked on a new
-- booking (uses the same idx_unavail_cin index).
-- ============================================================================
alter table public.unavailable_periods
  add column if not exists damaged boolean not null default false;

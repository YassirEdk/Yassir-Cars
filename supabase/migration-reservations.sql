-- ============================================================================
-- Reservations — run ONCE in Supabase → SQL Editor (after schema.sql).
-- Adds client details to the date-block rows so each block IS a reservation.
-- ============================================================================
alter table public.unavailable_periods
  add column if not exists client_name   text,
  add column if not exists cin           text,
  add column if not exists tel           text,
  add column if not exists matriculation text;

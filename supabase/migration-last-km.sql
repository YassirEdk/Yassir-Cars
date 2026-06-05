-- ============================================================================
-- Last declared km per car — run ONCE in Supabase → SQL Editor.
-- Updated automatically on every confirmed return or service entry.
-- ============================================================================
alter table public.cars
  add column if not exists last_km integer;

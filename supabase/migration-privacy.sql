-- ============================================================================
-- Privacy hardening — run ONCE in Supabase → SQL Editor (after the others).
--
-- PROBLEM: `unavailable_periods` was world-readable ("periods public read"),
-- but it now holds client PII (name, CIN, phone, licence numbers, 2nd driver).
-- With the anon key, ANY visitor could read every client's personal data.
--
-- FIX: only logged-in admins may read the table. The public site still needs
-- the date ranges to compute availability, so we expose ONLY those columns
-- (no PII) through a dedicated view.
-- ============================================================================

-- 1. Remove the public read policy. The existing "periods admin write" policy
--    is `for all to authenticated`, so admins keep full read + write access.
drop policy if exists "periods public read" on public.unavailable_periods;

-- 2. Public, PII-free availability view: just the blocked date ranges per car.
--    Runs with the view owner's rights, so it bypasses the table RLS above and
--    returns the date ranges (and nothing else) to anonymous visitors.
create or replace view public.car_availability as
  select id, car_id, start_date, end_date
  from public.unavailable_periods;

grant select on public.car_availability to anon, authenticated;

-- ============================================================================
-- DONE. After running this, anonymous users can no longer read client PII;
-- the public site reads `car_availability` for booking conflicts instead.
-- ============================================================================

-- ============================================================================
-- Multi-photo support — run ONCE in Supabase → SQL Editor (after schema.sql).
-- Adds a `photos` array (gallery). `photo` stays as the cover (= photos[0]).
-- ============================================================================
alter table public.cars add column if not exists photos text[];

-- Backfill: copy each car's existing single photo into the new array.
update public.cars
  set photos = array[photo]
  where (photos is null or photos = '{}') and photo is not null;

-- ============================================================================
-- Per-unit fleet — run ONCE in Supabase → SQL Editor (after schema.sql).
-- Each physical car is a row in `cars`; these columns tell units apart.
-- The public site merges rows with the same `name` into one card.
-- ============================================================================
alter table public.cars
  add column if not exists color           text,   -- hex swatch, e.g. '#1a1a1a'
  add column if not exists immatriculation text;   -- license plate

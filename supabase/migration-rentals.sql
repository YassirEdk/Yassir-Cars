-- ============================================================================
-- Rental workflow — run ONCE in Supabase → SQL Editor (after schema.sql and
-- migration-reservations.sql).
-- Tracks each reservation through three stages:
--   'reservee'  → booked (default, shown under « Réservations »)
--   'en_cours'  → car handed over to the client (« Voiture avec qui »)
--   'terminee'  → car returned (« Location historique »)
-- Plus the odometer reading at pick-up and at return.
-- ============================================================================
alter table public.unavailable_periods
  add column if not exists status        text    not null default 'reservee',
  add column if not exists departure_km  integer,
  add column if not exists return_km     integer;

create index if not exists idx_unavail_status on public.unavailable_periods(status);

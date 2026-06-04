-- ============================================================================
-- CIN index — run ONCE in Supabase → SQL Editor.
-- Makes the "is this CIN already used by another name?" lookup fast: the DB
-- jumps straight to matching rows instead of scanning the whole table, so the
-- check stays in the millisecond range even with millions of reservations.
-- ============================================================================
create index if not exists idx_unavail_cin on public.unavailable_periods(cin);

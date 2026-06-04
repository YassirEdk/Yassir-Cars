-- ============================================================================
-- Car services (maintenance log) — run ONCE in Supabase → SQL Editor.
-- One row per service done on a car (vidange, freins, …). Admin-only.
-- ============================================================================
create table if not exists public.car_services (
  id           uuid primary key default gen_random_uuid(),
  car_id       uuid not null references public.cars(id) on delete cascade,
  service      text not null,            -- e.g. 'Vidange', 'Freins'
  service_date date,
  mileage      integer,                  -- km at the time
  cost         numeric,                  -- MAD
  note         text,
  created_at   timestamptz default now()
);

create index if not exists idx_car_services_car on public.car_services(car_id);

alter table public.car_services enable row level security;

drop policy if exists "services admin all" on public.car_services;
-- Maintenance data is internal: only logged-in admins can read or write.
create policy "services admin all"
  on public.car_services for all
  to authenticated
  using (true) with check (true);

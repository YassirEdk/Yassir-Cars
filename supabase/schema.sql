-- ============================================================================
-- YASSIR CARS — Supabase schema
-- Run this ONCE in your Supabase project:  Dashboard → SQL Editor → New query
-- → paste all of this → Run.
-- ============================================================================

-- ── 1. Cars table ──────────────────────────────────────────────────────────
create table if not exists public.cars (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null default 'economique',  -- main category key
  categories    text[],                              -- optional extra categories
  photo         text,                                -- public URL from storage
  brand_logo    text,
  brand_color   text default '#1a1a1a',
  white_filter  boolean default false,
  price         integer not null default 0,
  currency      text default 'MAD',
  fuel          text default 'Diesel',
  transmission  text default 'Manuel',
  seats         integer default 5,
  extra         text default 'Clim',
  badge         text,
  badge_color   text,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

-- ── 2. Unavailable periods (date-range blocking per car) ────────────────────
create table if not exists public.unavailable_periods (
  id          uuid primary key default gen_random_uuid(),
  car_id      uuid not null references public.cars(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  note        text,
  created_at  timestamptz default now()
);

create index if not exists idx_unavail_car on public.unavailable_periods(car_id);
create index if not exists idx_unavail_dates on public.unavailable_periods(start_date, end_date);

-- ── 3. Row Level Security ───────────────────────────────────────────────────
-- Public visitors can READ everything. Only logged-in admins can write.
alter table public.cars enable row level security;
alter table public.unavailable_periods enable row level security;

drop policy if exists "cars public read"   on public.cars;
drop policy if exists "cars admin write"    on public.cars;
drop policy if exists "periods public read" on public.unavailable_periods;
drop policy if exists "periods admin write" on public.unavailable_periods;

create policy "cars public read"
  on public.cars for select
  using (true);

create policy "cars admin write"
  on public.cars for all
  to authenticated
  using (true) with check (true);

create policy "periods public read"
  on public.unavailable_periods for select
  using (true);

create policy "periods admin write"
  on public.unavailable_periods for all
  to authenticated
  using (true) with check (true);

-- ── 4. Storage bucket for car photos ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

drop policy if exists "car photos public read"  on storage.objects;
drop policy if exists "car photos admin write"   on storage.objects;
drop policy if exists "car photos admin update"  on storage.objects;
drop policy if exists "car photos admin delete"  on storage.objects;

create policy "car photos public read"
  on storage.objects for select
  using (bucket_id = 'car-photos');

create policy "car photos admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'car-photos');

create policy "car photos admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'car-photos');

create policy "car photos admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'car-photos');

-- ============================================================================
-- DONE. Next: Dashboard → Authentication → Users → Add user (your admin
-- email + password). That's the login for /admin.
-- (Optional) Seed your existing 6 cars: run seed.sql after this.
-- ============================================================================

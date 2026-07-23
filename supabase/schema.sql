-- ============================================================================
-- YASSIR CARS — complete Supabase schema (single file).
--
-- This is the FULL, final-state database setup. Run it ONCE in your Supabase
-- project: Dashboard → SQL Editor → New query → paste all of this → Run.
--
-- It is safe to re-run: every statement is idempotent (create ... if not
-- exists / add column if not exists / drop policy if exists). Running it again
-- on an existing database makes no destructive changes — it only fills in
-- anything missing.
--
-- After running, optionally run the seed section at the very bottom to import
-- the 6 starter cars, then add your admin login under:
--   Dashboard → Authentication → Users → Add user (email + password = /admin login)
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1. CARS — one row per physical car (units sharing a `name` merge into one
--    card on the public site).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.cars (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  category        text not null default 'economique',  -- main category key
  categories      text[],                              -- optional extra categories
  photo           text,                                -- cover photo (= photos[0]), public URL
  photos          text[],                              -- gallery
  brand_logo      text,
  brand_color     text default '#1a1a1a',
  white_filter    boolean default false,
  price           integer not null default 0,
  currency        text default 'MAD',
  fuel            text default 'Diesel',
  transmission    text default 'Manuel',
  seats           integer default 5,
  extra           text default 'Clim',
  features        text[],                              -- équipements/options keys (see carFeatures in data.js)
  badge           text,
  badge_color     text,
  sort_order      integer default 0,
  color           text,                                -- per-unit hex swatch, e.g. '#1a1a1a'
  immatriculation text,                                -- per-unit license plate
  damaged         boolean not null default false,      -- out of service: can't be booked
  last_km         integer,                             -- last declared odometer reading
  created_at      timestamptz default now()
);


-- ════════════════════════════════════════════════════════════════════════════
-- 2. UNAVAILABLE PERIODS / RESERVATIONS — each date-block row is a reservation,
--    carrying the client details and rental workflow status.
--      status: 'reservee'  → booked (default)
--              'en_cours'  → car handed over to the client
--              'terminee'  → car returned
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.unavailable_periods (
  id                    uuid primary key default gen_random_uuid(),
  car_id                uuid not null references public.cars(id) on delete cascade,
  start_date            date not null,
  end_date              date not null,
  note                  text,
  -- client details (PII — only admins may read, see RLS below)
  client_name           text,
  cin                   text,
  tel                   text,
  matriculation         text,
  licence_number        text,
  second_driver_name    text,
  second_driver_cin     text,
  second_driver_licence text,
  -- rental workflow
  status                text not null default 'reservee',
  departure_km          integer,
  return_km             integer,
  damaged               boolean not null default false,  -- car returned damaged
  created_at            timestamptz default now()
);

create index if not exists idx_unavail_car    on public.unavailable_periods(car_id);
create index if not exists idx_unavail_dates  on public.unavailable_periods(start_date, end_date);
create index if not exists idx_unavail_status on public.unavailable_periods(status);
create index if not exists idx_unavail_cin    on public.unavailable_periods(cin);


-- ════════════════════════════════════════════════════════════════════════════
-- 3. CAR SERVICES — maintenance log (vidange, freins, …). Admin-only.
-- ════════════════════════════════════════════════════════════════════════════
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


-- ════════════════════════════════════════════════════════════════════════════
-- 4. APP SETTINGS — single-row key/value table the admin edits (WhatsApp
--    number, social links, minimum rental length).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.app_settings (
  id              integer primary key default 1,
  whatsapp        text,          -- international digits, no leading 0 (e.g. 212661234567)
  phone           text,          -- public call number, same format; hidden site-wide when NULL
  contact_email   text,          -- public email; hidden when NULL
  address         text,          -- public address shown on the contact block; hidden when NULL
  instagram_url   text,
  facebook_url    text,
  tiktok_url      text,
  min_rental_days integer not null default 3,
  discount_rate     integer not null default 30,    -- % off the daily rate
  discount_active   boolean not null default true,  -- master promotion switch
  discount_all_cars boolean not null default true,  -- false → only discount_car_ids
  discount_car_ids  text[]  not null default '{}',  -- cars the promotion applies to
  min_long_duration_days integer not null default 30,  -- minimum days for the « Longue durée » tab
  updated_at      timestamptz default now(),
  constraint app_settings_single_row check (id = 1)
);

-- Upgrade existing databases. `features` must be a text[] array. If it's
-- missing it's added; if it exists with the wrong type (e.g. an older
-- character(50)/text column), it's converted to text[] so saving a list of
-- équipement keys no longer fails with "value too long for type character(50)".
do $$
declare
  col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'cars' and column_name = 'features';

  if col_type is null then
    alter table public.cars add column features text[];
  elsif col_type <> 'ARRAY' then
    -- Wrong type → convert. Any single existing value becomes a 1-element array
    -- (empty/blank values become an empty array), then lock the type to text[].
    alter table public.cars
      alter column features type text[]
      using (case
               when features is null or btrim(features::text) = '' then '{}'::text[]
               else array[features::text]
             end);
  end if;
end $$;

-- Upgrade existing databases (table created before tiktok_url existed).
alter table public.app_settings add column if not exists tiktok_url text;

-- Upgrade existing databases (table created before min_long_duration_days existed).
alter table public.app_settings add column if not exists min_long_duration_days integer not null default 30;

-- Public contact details. Left NULL on purpose: the site hides the phone row,
-- the email and the address whenever they are empty, so a placeholder number is
-- never shown to a customer. Fill them in from the admin « Réglages » modal.
alter table public.app_settings add column if not exists phone         text;
alter table public.app_settings add column if not exists contact_email text;
alter table public.app_settings add column if not exists address       text;

-- Promotional discount, whole percent off the daily rate (0 = no promotion).
-- Defaults to 30 to preserve what the site displayed when this was hardcoded.
alter table public.app_settings add column if not exists discount_rate integer not null default 30;

-- Promotion switch and scope.
--   discount_active   : master on/off, independent of the rate.
--   discount_all_cars : true  → every car, including ones added later.
--                       false → only the cars listed in discount_car_ids.
-- Both default to the previous behaviour (30% on the whole fleet).
alter table public.app_settings add column if not exists discount_active   boolean not null default true;
alter table public.app_settings add column if not exists discount_all_cars boolean not null default true;
alter table public.app_settings add column if not exists discount_car_ids  text[]  not null default '{}';

insert into public.app_settings (id, whatsapp, instagram_url, facebook_url, min_rental_days)
values (1, '212661000000', '', '', 3)
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY
--    cars                : public read,  admin write
--    unavailable_periods : ADMIN-ONLY  (holds client PII; public reads the
--                          PII-free `car_availability` view instead)
--    car_services        : admin-only
--    app_settings        : public read,  admin write
-- ════════════════════════════════════════════════════════════════════════════
alter table public.cars                enable row level security;
alter table public.unavailable_periods enable row level security;
alter table public.car_services        enable row level security;
alter table public.app_settings        enable row level security;

-- cars ----------------------------------------------------------------------
drop policy if exists "cars public read" on public.cars;
drop policy if exists "cars admin write" on public.cars;

create policy "cars public read"
  on public.cars for select
  using (true);

create policy "cars admin write"
  on public.cars for all
  to authenticated
  using (true) with check (true);

-- unavailable_periods (no public read — PII) --------------------------------
drop policy if exists "periods public read" on public.unavailable_periods;  -- ensure removed
drop policy if exists "periods admin write" on public.unavailable_periods;

create policy "periods admin write"
  on public.unavailable_periods for all
  to authenticated
  using (true) with check (true);

-- car_services --------------------------------------------------------------
drop policy if exists "services admin all" on public.car_services;

create policy "services admin all"
  on public.car_services for all
  to authenticated
  using (true) with check (true);

-- app_settings --------------------------------------------------------------
drop policy if exists "settings public read" on public.app_settings;
drop policy if exists "settings admin write" on public.app_settings;

create policy "settings public read"
  on public.app_settings for select
  using (true);

create policy "settings admin write"
  on public.app_settings for all
  to authenticated
  using (true) with check (true);


-- ════════════════════════════════════════════════════════════════════════════
-- 6. PUBLIC AVAILABILITY VIEW — exposes ONLY the blocked date ranges (no PII)
--    so anonymous visitors can compute booking conflicts. Runs with the view
--    owner's rights, bypassing the admin-only RLS on the table above.
-- ════════════════════════════════════════════════════════════════════════════
create or replace view public.car_availability as
  select id, car_id, start_date, end_date
  from public.unavailable_periods;

grant select on public.car_availability to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 7. STORAGE — public bucket for car photos.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

drop policy if exists "car photos public read"  on storage.objects;
drop policy if exists "car photos admin write"  on storage.objects;
drop policy if exists "car photos admin update" on storage.objects;
drop policy if exists "car photos admin delete" on storage.objects;

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


-- ════════════════════════════════════════════════════════════════════════════
-- 8. OPTIONAL SEED — the 6 starter cars, so /admin isn't empty on a fresh DB.
--    Photos point at files in /public. Uncomment the block below (or run it
--    separately) the FIRST time only — re-running inserts duplicates.
-- ════════════════════════════════════════════════════════════════════════════
-- insert into public.cars
--   (name, category, categories, photo, brand_logo, brand_color, white_filter,
--    price, currency, fuel, transmission, seats, extra, badge, badge_color, sort_order)
-- values
--   ('Dacia Logan', 'economique', null, '/cars-fit/Logan.png', '/Dacia-logo.png',
--    '#0D5FAB', true, 250, 'MAD', 'Diesel', 'Manuel', 5, 'Clim', 'Populaire', 'red', 1),
--
--   ('Renault Clio', 'economique', array['economique','citadine'], '/cars-fit/Clio.png',
--    '/Renault-logo.png', '#1a1a1a', false, 300, 'MAD', 'Essence', 'Manuel', 5, 'Clim', null, null, 2),
--
--   ('Peugeot 508', 'berline', null, '/cars-fit/508_BLEU.png', '/Peugeot-logo.png',
--    '#1A4784', true, 550, 'MAD', 'Diesel', 'Auto', 5, 'Clim auto', 'Nouveau', 'blue', 3),
--
--   ('Hyundai Tucson', 'suv', null, '/cars-fit/New-tucson-1860x540.png', null,
--    '#002C5F', true, 700, 'MAD', 'Diesel', 'Auto', 5, 'Clim auto', null, null, 4),
--
--   ('Toyota Land Cruiser', 'suv', null, '/cars-fit/Toyota Land Cruiser.png',
--    '/Toyota-logo-500x281.png', '#1C1C1C', true, 1200, 'MAD', 'Diesel', 'Auto', 7,
--    'Tout terrain', 'Top choix', 'red', 5),
--
--   ('Mercedes Classe E', 'luxe', null, '/cars-fit/Class e.png',
--    '/mercedes-logo-mercedes-benz-logo-png-transparent-svg-vector-bie-13.png',
--    '#1A1A1A', false, 1800, 'MAD', 'Essence', 'Auto', 5, 'Full option', 'Prestige', 'gold', 6);

-- ════════════════════════════════════════════════════════════════════════════
-- 9. (OPTIONAL) HARDENING — lock all writes to a SINGLE admin account.
--
--    By default every write policy above is `to authenticated ... using (true)`,
--    meaning ANY logged-in user can write and read client PII. That is safe ONLY
--    if exactly one account exists. To be safe even if another account is ever
--    created, restrict writes to your specific admin email.
--
--    ⚠️ FIRST, in the Supabase dashboard: Authentication → Providers → Email →
--       turn OFF "Allow new users to sign up" (stops public signups entirely).
--
--    Then replace the four write policies. Set YOUR admin email below and run:
-- ----------------------------------------------------------------------------
-- do $$
-- declare admin_email text := 'admin@yassir-cars.ma';   -- ← your admin login
-- begin
--   -- cars
--   drop policy if exists "cars admin write" on public.cars;
--   execute format($p$create policy "cars admin write" on public.cars for all
--     to authenticated using (auth.jwt()->>'email' = %L) with check (auth.jwt()->>'email' = %L)$p$, admin_email, admin_email);
--   -- unavailable_periods
--   drop policy if exists "periods admin write" on public.unavailable_periods;
--   execute format($p$create policy "periods admin write" on public.unavailable_periods for all
--     to authenticated using (auth.jwt()->>'email' = %L) with check (auth.jwt()->>'email' = %L)$p$, admin_email, admin_email);
--   -- car_services
--   drop policy if exists "services admin all" on public.car_services;
--   execute format($p$create policy "services admin all" on public.car_services for all
--     to authenticated using (auth.jwt()->>'email' = %L) with check (auth.jwt()->>'email' = %L)$p$, admin_email, admin_email);
--   -- app_settings
--   drop policy if exists "settings admin write" on public.app_settings;
--   execute format($p$create policy "settings admin write" on public.app_settings for all
--     to authenticated using (auth.jwt()->>'email' = %L) with check (auth.jwt()->>'email' = %L)$p$, admin_email, admin_email);
-- end $$;
-- ----------------------------------------------------------------------------
-- (Storage writes to 'car-photos' stay `to authenticated`; lock them the same
--  way if needed by adding `and (auth.jwt()->>'email' = '...')` to those policies.)

-- ============================================================================
-- DONE.
-- ============================================================================

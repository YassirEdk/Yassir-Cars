-- ============================================================================
-- App settings — run ONCE in Supabase → SQL Editor.
-- A single-row key/value table the admin can edit (phone/WhatsApp number,
-- social links, minimum rental length). The public site reads it to fill the
-- WhatsApp button, footer links and date pickers.
-- ============================================================================
create table if not exists public.app_settings (
  id              integer primary key default 1,
  whatsapp        text,          -- international digits, no leading 0 (e.g. 212661234567)
  instagram_url   text,
  facebook_url    text,
  min_rental_days integer not null default 3,
  updated_at      timestamptz default now(),
  constraint app_settings_single_row check (id = 1)
);

-- Seed the single row (id = 1) if it isn't there yet.
insert into public.app_settings (id, whatsapp, instagram_url, facebook_url, min_rental_days)
values (1, '212661000000', '', '', 3)
on conflict (id) do nothing;

-- ── Row Level Security: everyone can read, only admins can write ────────────
alter table public.app_settings enable row level security;

drop policy if exists "settings public read" on public.app_settings;
drop policy if exists "settings admin write" on public.app_settings;

create policy "settings public read"
  on public.app_settings for select
  using (true);

create policy "settings admin write"
  on public.app_settings for all
  to authenticated
  using (true) with check (true);

-- ============================================================================
-- DONE. Edit these values from the admin dashboard → "⚙ Réglages".
-- ============================================================================

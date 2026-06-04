-- ============================================================================
-- OPTIONAL seed — imports your current 6 cars so /admin isn't empty.
-- Run AFTER schema.sql.  Photos point at your existing /public files.
-- ============================================================================
insert into public.cars
  (name, category, categories, photo, brand_logo, brand_color, white_filter,
   price, currency, fuel, transmission, seats, extra, badge, badge_color, sort_order)
values
  ('Dacia Logan', 'economique', null, '/cars-fit/Logan.png', '/Dacia-logo.png',
   '#0D5FAB', true, 250, 'MAD', 'Diesel', 'Manuel', 5, 'Clim', 'Populaire', 'red', 1),

  ('Renault Clio', 'economique', array['economique','citadine'], '/cars-fit/Clio.png',
   '/Renault-logo.png', '#1a1a1a', false, 300, 'MAD', 'Essence', 'Manuel', 5, 'Clim', null, null, 2),

  ('Peugeot 508', 'berline', null, '/cars-fit/508_BLEU.png', '/Peugeot-logo.png',
   '#1A4784', true, 550, 'MAD', 'Diesel', 'Auto', 5, 'Clim auto', 'Nouveau', 'blue', 3),

  ('Hyundai Tucson', 'suv', null, '/cars-fit/New-tucson-1860x540.png', null,
   '#002C5F', true, 700, 'MAD', 'Diesel', 'Auto', 5, 'Clim auto', null, null, 4),

  ('Toyota Land Cruiser', 'suv', null, '/cars-fit/Toyota Land Cruiser.png',
   '/Toyota-logo-500x281.png', '#1C1C1C', true, 1200, 'MAD', 'Diesel', 'Auto', 7,
   'Tout terrain', 'Top choix', 'red', 5),

  ('Mercedes Classe E', 'luxe', null, '/cars-fit/Class e.png',
   '/mercedes-logo-mercedes-benz-logo-png-transparent-svg-vector-bie-13.png',
   '#1A1A1A', false, 1800, 'MAD', 'Essence', 'Auto', 5, 'Full option', 'Prestige', 'gold', 6);

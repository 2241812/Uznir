-- Uznir seed data
-- Reference data that should exist in every environment (dev, staging, prod)

-- Trade categories
insert into public.trades (id, slug, name) values
  (1, 'driver', 'Driver'),
  (2, 'carpenter', 'Carpenter'),
  (3, 'plumber', 'Plumber'),
  (4, 'electrician', 'Electrician'),
  (5, 'courier', 'Courier / Errands'),
  (6, 'cleaner', 'Cleaner'),
  (7, 'handyman', 'Handyman'),
  (8, 'painter', 'Painter'),
  (9, 'gardener', 'Gardener'),
  (10, 'welder', 'Welder'),
  (11, 'mover', 'Mover'),
  (12, 'ac_tech', 'AC Technician')
on conflict (id) do nothing;

-- ============================================================
-- Migration: Add photo capture with GPS to work_orders
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Add columns to store work photo with GPS location data
alter table public.work_orders
  add column if not exists work_photo jsonb default null;

-- work_photo structure:
-- {
--   "photo": "data:image/jpeg;base64,...",
--   "gps": {
--     "lat": 10.123456,
--     "lng": -75.456789,
--     "accuracy": 10
--   },
--   "timestamp": "2026-06-15T10:30:00.000Z"
-- }

-- Create index for GPS coordinates for future queries
create index if not exists idx_work_orders_gps
  on public.work_orders using gin (work_photo);

-- Update RLS policies to allow photo updates
drop policy if exists "Allow update work_orders" on public.work_orders;
create policy "Allow update work_orders"
  on public.work_orders for update
  using (true)
  with check (true);

-- Optional: Create a helper function to extract GPS coordinates for queries
create or replace function public.extract_work_photo_gps(photo jsonb)
returns table(latitude numeric, longitude numeric, accuracy int) as $$
begin
  return query
  select
    (photo->'gps'->>'lat')::numeric as latitude,
    (photo->'gps'->>'lng')::numeric as longitude,
    (photo->'gps'->>'accuracy')::int as accuracy;
end;
$$ language plpgsql immutable;

-- Example: Query work orders with GPS data
-- SELECT id, extract_work_photo_gps(work_photo) FROM public.work_orders WHERE work_photo IS NOT NULL;

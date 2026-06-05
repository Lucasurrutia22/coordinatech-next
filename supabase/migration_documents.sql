-- ============================================================
-- Migration: Add document storage to work_orders
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Add documents field to store JSON array of file metadata
alter table public.work_orders 
  add column if not exists documents jsonb default '[]'::jsonb,
  add column if not exists photos jsonb default '[]'::jsonb;

-- Documents structure:
-- [
--   {
--     "id": "unique-id",
--     "name": "documento.pdf",
--     "type": "application/pdf",
--     "size": 123456,
--     "url": "data:application/pdf;base64,...", // or external URL
--     "uploaded_at": "2026-06-05T..."
--   }
-- ]

-- Create index for faster queries
create index if not exists idx_work_orders_ticket_id
  on public.work_orders (ticket_id);

-- Update policies to allow document updates
drop policy if exists "Allow insert work_orders" on public.work_orders;
create policy "Allow insert work_orders"
  on public.work_orders for insert
  with check (true);

drop policy if exists "Allow update work_orders" on public.work_orders;
create policy "Allow update work_orders"
  on public.work_orders for update
  using (true)
  with check (true);

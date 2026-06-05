-- ============================================================
-- Migration: create incomplete_reports table + update tickets
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- 1. Si la columna status de tickets tiene un CHECK constraint que no incluye
--    'not_completed', ejecuta esto para eliminarlo y permitir el nuevo valor:
--
--    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
--    ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check
--      CHECK (status IN ('pending','assigned','in_progress','completed','not_completed'));
--
--    Si la columna es de tipo TEXT libre (sin constraint), no es necesario.

-- 2. Create incomplete_reports table
create table if not exists public.incomplete_reports (
  id               text primary key,
  ticket_id        text references public.tickets(id) on delete set null,
  reported_at      timestamptz not null default now(),
  tech_id          text not null,
  tech_name        text not null,
  reason           text not null,
  photo_data       text -- base64 data URL of the evidence photo
);

-- Enable Row Level Security
alter table public.incomplete_reports enable row level security;

-- Allow select for all (admin reads evidence)
create policy "Allow select incomplete_reports"
  on public.incomplete_reports for select
  using (true);

-- Allow insert for all (techs submit reports)
create policy "Allow insert incomplete_reports"
  on public.incomplete_reports for insert
  with check (true);

-- 3. Index for fast lookup by ticket
create index if not exists idx_incomplete_reports_ticket_id
  on public.incomplete_reports (ticket_id);

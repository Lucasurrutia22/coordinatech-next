-- ============================================================
-- Migration: Capture GPS location on ticket "started" event
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Coordenadas capturadas por el técnico al presionar "Iniciar" en el
-- cronómetro de trabajo. Permite al admin ver desde dónde se inició el ticket.
alter table public.work_time_logs
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

create index if not exists idx_work_time_logs_location
  on public.work_time_logs (latitude, longitude)
  where latitude is not null and longitude is not null;

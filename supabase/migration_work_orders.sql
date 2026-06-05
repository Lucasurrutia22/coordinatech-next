-- ============================================================
-- Migration: create work_orders table
-- Run this in the Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

create table if not exists public.work_orders (
  id               text primary key,
  ticket_id        text references public.tickets(id) on delete set null,
  submitted_at     timestamptz not null default now(),
  tech_name        text,
  tech_email       text,
  cliente_nombre   text,
  cliente_local    text,
  cliente_direccion text,
  cliente_ciudad   text,
  problematica     text,
  solucion         text,
  pruebas          text,
  reemplazo_equipo text,
  retira_equipo    boolean default false,
  supervisor_nombre text,
  recibe_nombre    text,
  recibe_cargo     text,
  rating           integer check (rating >= 1 and rating <= 5),
  razon_calificacion text
);

-- Enable Row Level Security
alter table public.work_orders enable row level security;

-- Allow anonymous/authenticated users to SELECT all orders (admin app reads them)
create policy "Allow select work_orders"
  on public.work_orders for select
  using (true);

-- Allow anonymous/authenticated users to INSERT new orders (techs submit forms)
create policy "Allow insert work_orders"
  on public.work_orders for insert
  with check (true);

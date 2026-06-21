-- Migración: Agregar campos de tiempo de trabajo y orden de soporte a tickets
alter table public.tickets
  add column if not exists work_started_at timestamptz,
  add column if not exists work_ended_at timestamptz,
  add column if not exists work_duration_ms integer default 0,
  add column if not exists active_duration_ms integer default 0,
  add column if not exists paused_duration_ms integer default 0,
  add column if not exists completion_type text check (completion_type in ('work_order', 'not_completed'));

-- Tabla para registrar logs de eventos de trabajo
create table if not exists public.work_time_logs (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references public.tickets(id) on delete cascade,
  technician_id text not null references public.technicians(id) on delete cascade,
  event_type text not null check (event_type in ('started', 'paused', 'resumed', 'completed')),
  timestamp timestamptz not null default now(),
  duration_ms integer,
  notes text,
  created_at timestamptz not null default now()
);

-- Tabla para registrar pausas de trabajo
create table if not exists public.work_breaks (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references public.tickets(id) on delete cascade,
  technician_id text not null references public.technicians(id) on delete cascade,
  break_start timestamptz not null default now(),
  break_end timestamptz,
  break_duration_ms integer,
  break_reason text,
  created_at timestamptz not null default now()
);

-- Tabla para órdenes de soporte generadas automáticamente
create table if not exists public.work_orders (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references public.tickets(id) on delete cascade,
  technician_id text not null references public.technicians(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  description text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Crear índices para mejor performance
create index if not exists idx_work_time_logs_ticket_id on public.work_time_logs(ticket_id);
create index if not exists idx_work_time_logs_technician_id on public.work_time_logs(technician_id);
create index if not exists idx_work_breaks_ticket_id on public.work_breaks(ticket_id);
create index if not exists idx_work_breaks_technician_id on public.work_breaks(technician_id);
create index if not exists idx_work_orders_ticket_id on public.work_orders(ticket_id);
create index if not exists idx_work_orders_technician_id on public.work_orders(technician_id);

-- Habilitar RLS en nuevas tablas
alter table public.work_time_logs enable row level security;
alter table public.work_breaks enable row level security;
alter table public.work_orders enable row level security;

-- Políticas de acceso público (desarrollo - cambiar en producción)
drop policy if exists work_time_logs_public_select on public.work_time_logs;
create policy work_time_logs_public_select
on public.work_time_logs
for select
to anon
using (true);

drop policy if exists work_time_logs_public_insert on public.work_time_logs;
create policy work_time_logs_public_insert
on public.work_time_logs
for insert
to anon
with check (true);

drop policy if exists work_breaks_public_select on public.work_breaks;
create policy work_breaks_public_select
on public.work_breaks
for select
to anon
using (true);

drop policy if exists work_breaks_public_insert on public.work_breaks;
create policy work_breaks_public_insert
on public.work_breaks
for insert
to anon
with check (true);

drop policy if exists work_breaks_public_update on public.work_breaks;
create policy work_breaks_public_update
on public.work_breaks
for update
to anon
using (true)
with check (true);

drop policy if exists work_orders_public_select on public.work_orders;
create policy work_orders_public_select
on public.work_orders
for select
to anon
using (true);

drop policy if exists work_orders_public_insert on public.work_orders;
create policy work_orders_public_insert
on public.work_orders
for insert
to anon
with check (true);

drop policy if exists work_orders_public_update on public.work_orders;
create policy work_orders_public_update
on public.work_orders
for update
to anon
using (true)
with check (true);

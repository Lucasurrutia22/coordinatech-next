-- ============================================================================
-- MIGRACIÓN CONSOLIDADA — CoordinaTech
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================
-- Por qué existe este script: supabase/ tiene ~10 migraciones históricas que
-- se contradicen entre sí para las mismas tablas (work_time_logs, work_breaks,
-- work_orders) — una incluso usa sintaxis inválida en Postgres
-- ("CREATE POLICY IF NOT EXISTS", que no existe) y otra deshabilitó RLS a la
-- fuerza como parche. No hay forma de saber desde el código cuál de esas
-- versiones quedó realmente aplicada en tu base de datos.
--
-- Este script es 100% idempotente (se puede ejecutar varias veces sin error
-- ni duplicar nada) y converge al mismo estado final sin importar cuál de las
-- migraciones anteriores alcanzaste a correr. No borra ni trunca datos.
-- ============================================================================


-- ── 1. TICKETS: columnas del ciclo de vida completo ────────────────────────
alter table public.tickets
  add column if not exists work_started_at timestamptz,
  add column if not exists work_ended_at timestamptz,
  add column if not exists paused_duration_ms bigint default 0,
  add column if not exists active_duration_ms bigint default 0,
  add column if not exists completion_type text,
  add column if not exists evidence jsonb default '{}'::jsonb,
  add column if not exists is_archived boolean default false;

-- work_duration_ms puede haber quedado como integer (desborda en tickets muy
-- largos, ~24 días); lo ensanchamos a bigint si hace falta.
alter table public.tickets
  add column if not exists work_duration_ms bigint default 0;
do $$
begin
  alter table public.tickets alter column work_duration_ms type bigint;
exception when others then null;
end $$;

-- El check constraint de status no incluía 'not_completed' (usado al marcar
-- un ticket como no completado) — lo recreamos completo.
alter table public.tickets drop constraint if exists tickets_status_check;
alter table public.tickets add constraint tickets_status_check
  check (status in ('pending', 'assigned', 'in_progress', 'completed', 'not_completed'));

-- completion_type también necesita su propio check.
alter table public.tickets drop constraint if exists tickets_completion_type_check;
alter table public.tickets add constraint tickets_completion_type_check
  check (completion_type is null or completion_type in ('work_order', 'not_completed'));

create index if not exists idx_tickets_is_archived on public.tickets(is_archived);
create index if not exists idx_tickets_status_archived on public.tickets(status, is_archived);


-- ── 2. WORK_TIME_LOGS + WORK_BREAKS ─────────────────────────────────────────
-- IDs en TEXT (no UUID) para que coincidan con tickets.id/technicians.id,
-- que son TEXT (ej. "ST-001", "TECH-001") — una FK UUID->TEXT nunca podría
-- haberse creado, así que si esta tabla ya existe, ya debe tener esta forma.
create table if not exists public.work_time_logs (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references public.tickets(id) on delete cascade,
  technician_id text not null references public.technicians(id) on delete cascade,
  event_type text not null check (event_type in ('started', 'paused', 'resumed', 'completed')),
  timestamp timestamptz not null default now(),
  duration_ms bigint,
  notes text,
  created_at timestamptz not null default now()
);

-- Ubicación GPS capturada al iniciar el trabajo (feature agregada recientemente).
alter table public.work_time_logs
  add column if not exists latitude numeric,
  add column if not exists longitude numeric;

create table if not exists public.work_breaks (
  id text primary key default gen_random_uuid()::text,
  ticket_id text not null references public.tickets(id) on delete cascade,
  technician_id text not null references public.technicians(id) on delete cascade,
  break_start timestamptz not null default now(),
  break_end timestamptz,
  break_duration_ms bigint,
  break_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_time_logs_ticket_id on public.work_time_logs(ticket_id);
create index if not exists idx_work_time_logs_technician_id on public.work_time_logs(technician_id);
create index if not exists idx_work_breaks_ticket_id on public.work_breaks(ticket_id);
create index if not exists idx_work_breaks_technician_id on public.work_breaks(technician_id);

-- RLS: habilitado con políticas explícitas y abiertas — reemplaza tanto las
-- políticas rotas basadas en tenant_id (que exigían auth.uid()/tenant_id, y
-- esta app no usa Supabase Auth real) como el parche que deshabilitó RLS.
alter table public.work_time_logs enable row level security;
alter table public.work_breaks enable row level security;

drop policy if exists work_time_logs_public_select on public.work_time_logs;
create policy work_time_logs_public_select on public.work_time_logs for select to anon using (true);
drop policy if exists work_time_logs_public_insert on public.work_time_logs;
create policy work_time_logs_public_insert on public.work_time_logs for insert to anon with check (true);

drop policy if exists work_breaks_public_select on public.work_breaks;
create policy work_breaks_public_select on public.work_breaks for select to anon using (true);
drop policy if exists work_breaks_public_insert on public.work_breaks;
create policy work_breaks_public_insert on public.work_breaks for insert to anon with check (true);
drop policy if exists work_breaks_public_update on public.work_breaks;
create policy work_breaks_public_update on public.work_breaks for update to anon using (true) with check (true);


-- ── 3. WORK_ORDERS ───────────────────────────────────────────────────────────
-- Existen dos versiones históricas de esta tabla con columnas distintas; se
-- agregan TODAS las columnas de ambas variantes (además de foto/documentos)
-- para que sin importar cuál se creó primero, terminen todas presentes.
create table if not exists public.work_orders (
  id text primary key default gen_random_uuid()::text,
  ticket_id text references public.tickets(id) on delete set null,
  submitted_at timestamptz not null default now()
);

alter table public.work_orders
  add column if not exists technician_id text references public.technicians(id) on delete set null,
  add column if not exists status text default 'pending',
  add column if not exists description text,
  add column if not exists completed_at timestamptz,
  add column if not exists tech_name text,
  add column if not exists tech_email text,
  add column if not exists cliente_nombre text,
  add column if not exists cliente_local text,
  add column if not exists cliente_direccion text,
  add column if not exists cliente_ciudad text,
  add column if not exists problematica text,
  add column if not exists solucion text,
  add column if not exists pruebas text,
  add column if not exists reemplazo_equipo text,
  add column if not exists retira_equipo boolean default false,
  add column if not exists supervisor_nombre text,
  add column if not exists recibe_nombre text,
  add column if not exists recibe_cargo text,
  add column if not exists rating integer,
  add column if not exists razon_calificacion text,
  add column if not exists work_photo jsonb default null,
  add column if not exists documents jsonb default '[]'::jsonb,
  add column if not exists photos jsonb default '[]'::jsonb;

create index if not exists idx_work_orders_ticket_id on public.work_orders(ticket_id);

alter table public.work_orders enable row level security;
drop policy if exists work_orders_public_select on public.work_orders;
create policy work_orders_public_select on public.work_orders for select to anon using (true);
drop policy if exists "Allow select work_orders" on public.work_orders;
create policy "Allow select work_orders" on public.work_orders for select using (true);
drop policy if exists work_orders_public_insert on public.work_orders;
create policy work_orders_public_insert on public.work_orders for insert to anon with check (true);
drop policy if exists "Allow insert work_orders" on public.work_orders;
create policy "Allow insert work_orders" on public.work_orders for insert with check (true);
drop policy if exists work_orders_public_update on public.work_orders;
create policy work_orders_public_update on public.work_orders for update to anon using (true) with check (true);
drop policy if exists "Allow update work_orders" on public.work_orders;
create policy "Allow update work_orders" on public.work_orders for update using (true) with check (true);


-- ── 4. INCOMPLETE_REPORTS ────────────────────────────────────────────────────
create table if not exists public.incomplete_reports (
  id text primary key,
  ticket_id text references public.tickets(id) on delete set null,
  reported_at timestamptz not null default now(),
  tech_id text not null,
  tech_name text not null,
  reason text not null,
  photo_data text
);

create index if not exists idx_incomplete_reports_ticket_id on public.incomplete_reports(ticket_id);

alter table public.incomplete_reports enable row level security;
drop policy if exists "Allow select incomplete_reports" on public.incomplete_reports;
create policy "Allow select incomplete_reports" on public.incomplete_reports for select using (true);
drop policy if exists "Allow insert incomplete_reports" on public.incomplete_reports;
create policy "Allow insert incomplete_reports" on public.incomplete_reports for insert with check (true);


-- ── 5. VERIFICACIÓN ──────────────────────────────────────────────────────────
-- Debe devolver 6 filas: incomplete_reports, technicians, tickets,
-- work_breaks, work_orders, work_time_logs
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('tickets', 'technicians', 'work_time_logs', 'work_breaks', 'work_orders', 'incomplete_reports')
order by table_name;

-- Confirma que la columna clave para el bug reportado (ticket sin técnico
-- asignado no sincronizaba) acepta NULL:
select column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'tickets' and column_name = 'technician_id';

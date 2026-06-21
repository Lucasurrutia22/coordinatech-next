create table if not exists public.technicians (
  id text primary key,
  name text not null,
  email text unique not null,
  phone text not null,
  password text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id text primary key,
  ticket_type text not null default 'support' check (ticket_type in ('support', 'installation', 'removal')),
  title text not null,
  description text not null,
  address text not null,
  status text not null check (status in ('pending', 'assigned', 'in_progress', 'completed')),
  priority text not null check (priority in ('low', 'medium', 'high')),
  scheduled_date timestamptz not null,
  technician_id text references public.technicians(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Migración: agregar ticket_type si la tabla ya existe
alter table public.tickets
  add column if not exists ticket_type text not null default 'support'
    check (ticket_type in ('support', 'installation', 'removal'));

alter table public.technicians enable row level security;
alter table public.tickets enable row level security;

drop policy if exists technicians_public_select on public.technicians;
create policy technicians_public_select
on public.technicians
for select
to anon
using (true);

drop policy if exists technicians_public_insert on public.technicians;
create policy technicians_public_insert
on public.technicians
for insert
to anon
with check (true);

drop policy if exists technicians_public_update on public.technicians;
create policy technicians_public_update
on public.technicians
for update
to anon
using (true)
with check (true);

drop policy if exists tickets_public_select on public.tickets;
create policy tickets_public_select
on public.tickets
for select
to anon
using (true);

drop policy if exists tickets_public_insert on public.tickets;
create policy tickets_public_insert
on public.tickets
for insert
to anon
with check (true);

drop policy if exists tickets_public_update on public.tickets;
create policy tickets_public_update
on public.tickets
for update
to anon
using (true)
with check (true);

-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar ticket_type a la tabla tickets
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Agregar la columna (si ya existe no hace nada)
alter table public.tickets
  add column if not exists ticket_type text not null default 'support';

-- 2. Agregar la restricción de valores válidos
--    (Si da error porque ya existe, ignorar)
do $$
begin
  alter table public.tickets
    add constraint tickets_ticket_type_check
    check (ticket_type in ('support', 'installation', 'removal'));
exception
  when duplicate_object then null;
end;
$$;

-- 3. Actualizar tickets existentes que tengan id antiguo (TK-xxxx)
--    Asigna tipo 'support' por defecto
update public.tickets
  set ticket_type = 'support'
  where ticket_type is null or ticket_type = '';

-- 4. Eliminar los tickets de demo con IDs viejos
delete from public.tickets where id in ('TK-1001', 'TK-1002');

-- 5. Insertar tickets demo con los IDs correlativos nuevos
insert into public.tickets (id, ticket_type, title, description, address, status, priority, scheduled_date, technician_id)
values
  (
    'ST-001',
    'support',
    'Falla de conectividad en sucursal',
    'Cliente reporta intermitencia en red interna y puntos de venta.',
    'Av. Libertador 1024, Santiago',
    'assigned',
    'high',
    now() + interval '2 hours',
    'TECH-001'
  ),
  (
    'INS-001',
    'installation',
    'Instalación cámaras CCTV sucursal',
    'Instalacion de sistema CCTV 8 canales con grabacion en la nube.',
    'Camino El Alba 445, Las Condes',
    'pending',
    'medium',
    now() + interval '1 day',
    'TECH-002'
  ),
  (
    'RT-001',
    'removal',
    'Retiro equipo cliente dado de baja',
    'Retiro de switch y rack de comunicaciones de cliente que no renueva contrato.',
    'Av. Providencia 2332, Providencia',
    'pending',
    'low',
    now() + interval '3 days',
    'TECH-001'
  )
on conflict (id) do update
set
  ticket_type    = excluded.ticket_type,
  title          = excluded.title,
  description    = excluded.description,
  address        = excluded.address,
  status         = excluded.status,
  priority       = excluded.priority,
  scheduled_date = excluded.scheduled_date,
  technician_id  = excluded.technician_id;

-- ✅ Verificar resultado
select id, ticket_type, title, status from public.tickets order by created_at;

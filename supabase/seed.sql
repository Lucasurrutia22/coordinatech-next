insert into public.technicians (id, name, email, phone, password, active)
values
  ('TECH-001', 'Juan Perez', 'juan.perez@company.com', '+56 9 1111 1111', 'tech123', true),
  ('TECH-002', 'Ana Gonzalez', 'ana.gonzalez@company.com', '+56 9 2222 2222', 'tech123', true)
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  password = excluded.password,
  active = excluded.active;

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
  ticket_type = excluded.ticket_type,
  title = excluded.title,
  description = excluded.description,
  address = excluded.address,
  status = excluded.status,
  priority = excluded.priority,
  scheduled_date = excluded.scheduled_date,
  technician_id = excluded.technician_id;

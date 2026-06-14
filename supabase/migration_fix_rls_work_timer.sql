-- Corrección de RLS para Work Timer
-- En desarrollo: permitir acceso públicamente a todas las operaciones

-- Deshabilitar RLS temporalmente para desarrollo
alter table public.work_time_logs disable row level security;
alter table public.work_breaks disable row level security;
alter table public.work_orders disable row level security;

-- Alternativa: crear políticas permisivas (para producción usar políticas más restrictivas)
-- Las políticas existentes se mantienen pero ahora permiten desarrollo local

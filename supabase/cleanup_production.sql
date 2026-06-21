-- ==========================================
-- SCRIPT DE LIMPIEZA PARA PRODUCCIÓN
-- Elimina todos los datos de prueba
-- ==========================================

-- Paso 1: Desactivar restricciones de integridad referencial temporalmente
ALTER TABLE IF EXISTS public.work_orders DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.tickets DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.work_time_logs DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.work_breaks DISABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.incomplete_reports DISABLE TRIGGER ALL;

-- Paso 2: Eliminar datos en orden (sin dependencias primero)
TRUNCATE TABLE public.work_orders CASCADE;
TRUNCATE TABLE public.incomplete_reports CASCADE;
TRUNCATE TABLE public.work_breaks CASCADE;
TRUNCATE TABLE public.work_time_logs CASCADE;
TRUNCATE TABLE public.tickets CASCADE;
TRUNCATE TABLE public.technicians CASCADE;

-- Paso 3: Reiniciar secuencias (si las hay)
-- Opcional: Si usas UUID, no necesitas esto
-- ALTER SEQUENCE IF EXISTS technicians_id_seq RESTART WITH 1;

-- Paso 4: Reactivar restricciones
ALTER TABLE IF EXISTS public.work_orders ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.tickets ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.work_time_logs ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.work_breaks ENABLE TRIGGER ALL;
ALTER TABLE IF EXISTS public.incomplete_reports ENABLE TRIGGER ALL;

-- Confirmación
SELECT 'Limpieza completada!' as mensaje;
SELECT COUNT(*) as tecnicos FROM public.technicians;
SELECT COUNT(*) as tickets FROM public.tickets;
SELECT COUNT(*) as ordenes FROM public.work_orders;

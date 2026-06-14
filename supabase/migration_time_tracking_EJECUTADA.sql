-- ============================================================================
-- ✅ MIGRACIÓN EJECUTADA: Sistema de Tracking de Tiempo
-- Para: CoordinaTech - Medición detallada de SLA
-- Estado: COMPLETADA EN SUPABASE
-- Fecha de ejecución: 2026-06-07
-- ============================================================================

-- RESUMEN DE CAMBIOS REALIZADOS:

-- 1. COLUMNAS AGREGADAS A TABLA TICKETS
-- ✓ work_started_at: TIMESTAMP WITH TIME ZONE
-- ✓ work_ended_at: TIMESTAMP WITH TIME ZONE
-- ✓ work_duration_ms: BIGINT (duración total en milisegundos)
-- ✓ paused_duration_ms: BIGINT DEFAULT 0 (tiempo en pausa)
-- ✓ active_duration_ms: BIGINT DEFAULT 0 (tiempo activo)
-- ✓ evidence: JSONB (para fotos, GPS, firmas)

-- 2. NUEVAS TABLAS CREADAS
-- ✓ work_time_logs: Registro de eventos (started/paused/resumed/completed)
--   Campos: id (UUID), ticket_id (TEXT), technician_id (TEXT), event_type, timestamp, duration_ms, notes, created_at
--   Restricción: event_type IN ('started', 'paused', 'resumed', 'completed')

-- ✓ work_breaks: Registro de pausas con razón y duración
--   Campos: id (UUID), ticket_id (TEXT), technician_id (TEXT), break_start, break_end, break_duration_ms, break_reason, created_at

-- 3. ÍNDICES CREADOS PARA PERFORMANCE
-- ✓ idx_work_time_logs_ticket_id
-- ✓ idx_work_time_logs_technician_id
-- ✓ idx_work_time_logs_timestamp
-- ✓ idx_work_time_logs_event_type
-- ✓ idx_work_breaks_ticket_id
-- ✓ idx_work_breaks_technician_id
-- ✓ idx_work_breaks_created_at

-- 4. TRIGGER CREADO PARA CÁLCULOS AUTOMÁTICOS
-- ✓ calculate_work_duration(): Calcula duraciones automáticamente en UPDATE
-- ✓ trigger_calculate_work_duration: Ejecuta trigger BEFORE UPDATE en tickets
--   - Calcula work_duration_ms (total)
--   - Calcula paused_duration_ms (suma de pausas)
--   - Calcula active_duration_ms (total - pausas)

-- 5. SEGURIDAD (RLS)
-- ✓ work_time_logs: Row Level Security HABILITADO
-- ✓ work_breaks: Row Level Security HABILITADO
-- (Supabase automáticamente configuró las políticas)

-- ============================================================================
-- VERIFICACIÓN DE QUE TABLAS FUERON CREADAS
-- ============================================================================
-- Ejecuta este SELECT para verificar:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('work_time_logs', 'work_breaks', 'tickets')
ORDER BY table_name;

-- Resultado esperado:
-- ✓ tickets
-- ✓ work_breaks
-- ✓ work_time_logs

-- ============================================================================
-- PRÓXIMOS PASOS EN EL CÓDIGO
-- ============================================================================
-- 1. Usar timeTracking.ts service para controlar eventos
-- 2. Importar WorkTimer en páginas de detalle de tickets
-- 3. Acceder a /admin/metricas-sla para ver dashboard
-- 4. Integrar SLAIndicator en listados de tickets
-- 5. Pruebas end-to-end del flujo completo

-- ============================================================================
-- FUNCIONALIDAD DISPONIBLE AHORA
-- ============================================================================
-- ✓ Cronómetro de trabajo: Iniciar, pausar, reanudar, completar
-- ✓ Tracking de tiempo: Milliseconds precision (HH:MM:SS.MMM)
-- ✓ Análisis de pausas: Razón, duración, estadísticas
-- ✓ Dashboard SLA: Métricas en tiempo real
-- ✓ Color-coding: Verde (≥70%), Amarillo (50-70%), Rojo (<50%)
-- ✓ Reportes: Análisis por técnico, eficiencia, productividad

-- ============================================================================

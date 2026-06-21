-- ============================================================================
-- MIGRACIÓN: Sistema Avanzado de Tracking de Tiempo con Precisión de Milisegundos
-- Para: CoordinaTech - Medición detallada de SLA
-- ============================================================================

-- Paso 1: Agregar columnas a tabla tickets para tracking de tiempo
-- ============================================================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_duration_ms BIGINT COMMENT 'Duración total en milisegundos';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paused_duration_ms BIGINT DEFAULT 0 COMMENT 'Tiempo en pausa en milisegundos';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS active_duration_ms BIGINT DEFAULT 0 COMMENT 'Tiempo activo (sin pausas) en milisegundos';


-- Paso 2: Crear tabla work_time_logs para auditoria detallada
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms BIGINT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para validar tipos de evento
    CONSTRAINT valid_event_type CHECK (event_type IN ('started', 'paused', 'resumed', 'completed'))
);


-- Paso 3: Crear tabla work_breaks para tracking de pausas
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    break_duration_ms BIGINT,
    break_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Paso 4: Crear índices para mejorar performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_work_time_logs_ticket_id ON work_time_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_time_logs_technician_id ON work_time_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_time_logs_timestamp ON work_time_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_work_time_logs_event_type ON work_time_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_work_breaks_ticket_id ON work_breaks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_breaks_technician_id ON work_breaks(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_breaks_created_at ON work_breaks(created_at DESC);


-- Paso 5: Habilitar RLS (Row Level Security) para multi-tenant
-- ============================================================================
ALTER TABLE work_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_breaks ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios pueden ver logs de su propio tenant
CREATE POLICY IF NOT EXISTS "users_can_view_own_work_logs" ON work_time_logs
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM technicians t
            WHERE t.id = work_time_logs.technician_id
            AND t.tenant_id = (
                SELECT tenant_id FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Usuarios pueden insertar en work_time_logs
CREATE POLICY IF NOT EXISTS "users_can_insert_work_logs" ON work_time_logs
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians t
            WHERE t.id = work_time_logs.technician_id
            AND t.tenant_id = (
                SELECT tenant_id FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Usuarios pueden ver breaks de su propio tenant
CREATE POLICY IF NOT EXISTS "users_can_view_own_breaks" ON work_breaks
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM technicians t
            WHERE t.id = work_breaks.technician_id
            AND t.tenant_id = (
                SELECT tenant_id FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );

-- Policy: Usuarios pueden insertar/actualizar breaks
CREATE POLICY IF NOT EXISTS "users_can_manage_breaks" ON work_breaks
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM technicians t
            WHERE t.id = work_breaks.technician_id
            AND t.tenant_id = (
                SELECT tenant_id FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM technicians t
            WHERE t.id = work_breaks.technician_id
            AND t.tenant_id = (
                SELECT tenant_id FROM auth.users 
                WHERE id = auth.uid()
            )
        )
    );


-- Paso 6: Crear función para calcular duraciones automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_work_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.work_started_at IS NOT NULL AND NEW.work_ended_at IS NOT NULL THEN
        -- Calcular duración total en milisegundos
        NEW.work_duration_ms := EXTRACT(EPOCH FROM (NEW.work_ended_at - NEW.work_started_at)) * 1000;
        
        -- Calcular duración en pausas
        NEW.paused_duration_ms := COALESCE(
            (SELECT COALESCE(SUM(break_duration_ms), 0) 
             FROM work_breaks 
             WHERE ticket_id = NEW.id AND break_duration_ms IS NOT NULL),
            0
        );
        
        -- Calcular duración activa (total - pausas)
        NEW.active_duration_ms := NEW.work_duration_ms - NEW.paused_duration_ms;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente las duraciones
DROP TRIGGER IF EXISTS trigger_calculate_work_duration ON tickets;
CREATE TRIGGER trigger_calculate_work_duration
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    WHEN (
        OLD.work_started_at IS DISTINCT FROM NEW.work_started_at OR
        OLD.work_ended_at IS DISTINCT FROM NEW.work_ended_at
    )
    EXECUTE FUNCTION calculate_work_duration();


-- Paso 7: Agregar columna para almacenar evidencia (JSON)
-- ============================================================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}'::jsonb;


-- Paso 8: Verificación
-- ============================================================================
-- Este SELECT verifica que todo se creó correctamente
-- Debe retornar 3 tablas: work_time_logs, work_breaks, tickets
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('work_time_logs', 'work_breaks', 'tickets')
ORDER BY table_name;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
-- 
-- Tablas creadas:
--   ✓ work_time_logs - Registra eventos de trabajo (started/paused/resumed/completed)
--   ✓ work_breaks - Registra pausas con razón y duración
--   ✓ Campos añadidos en tickets para tracking de duración
--
-- Características:
--   ✓ Precisión de milisegundos
--   ✓ RLS multi-tenant
--   ✓ Triggers automáticos para cálculos
--   ✓ Índices para performance
--
-- Próximos pasos:
--   1. Usar servicio timeTracking.ts para controlar eventos
--   2. Integrar WorkTimer en UI
--   3. Acceder a /admin/metricas-sla para ver dashboard
-- 
-- ============================================================================

-- Migración para agregar campos de tracking de tiempo detallado
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas a tabla tickets para tracking de tiempo
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS work_duration_ms BIGINT; -- Duración en milisegundos
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paused_duration_ms BIGINT DEFAULT 0; -- Tiempo en pausa
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS active_duration_ms BIGINT DEFAULT 0; -- Tiempo activo solo

-- Crear tabla de logs de tiempo para auditoria detallada
CREATE TABLE IF NOT EXISTS work_time_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('started', 'paused', 'resumed', 'completed')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    duration_ms BIGINT, -- Duración desde el evento anterior
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de break tracking
CREATE TABLE IF NOT EXISTS work_breaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    break_duration_ms BIGINT,
    break_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_work_time_logs_ticket_id ON work_time_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_work_time_logs_technician_id ON work_time_logs(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_time_logs_timestamp ON work_time_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_work_breaks_ticket_id ON work_breaks(ticket_id);

-- RLS policies para work_time_logs
ALTER TABLE work_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_own_work_logs" ON work_time_logs
    FOR SELECT USING (
        (SELECT tenant_id FROM technicians WHERE id = technician_id) = 
        (SELECT tenant_id FROM auth.users WHERE auth.users.id = auth.uid())
    );

-- RLS policies para work_breaks
ALTER TABLE work_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_can_view_own_breaks" ON work_breaks
    FOR SELECT USING (
        (SELECT tenant_id FROM technicians WHERE id = technician_id) = 
        (SELECT tenant_id FROM auth.users WHERE auth.users.id = auth.uid())
    );

-- Función para calcular duración total incluidas pausas
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
             WHERE ticket_id = NEW.id),
            0
        );
        
        -- Calcular duración activa
        NEW.active_duration_ms := NEW.work_duration_ms - NEW.paused_duration_ms;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular automáticamente
DROP TRIGGER IF EXISTS trigger_calculate_work_duration ON tickets;
CREATE TRIGGER trigger_calculate_work_duration
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION calculate_work_duration();

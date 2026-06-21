import { supabase } from './supabase';

export interface WorkTimeLog {
  id: string;
  ticket_id: string;
  technician_id: string;
  event_type: 'started' | 'paused' | 'resumed' | 'completed';
  timestamp: string;
  duration_ms: number;
  notes?: string;
}

export interface WorkBreak {
  id: string;
  ticket_id: string;
  technician_id: string;
  break_start: string;
  break_end?: string;
  break_duration_ms?: number;
  break_reason?: string;
}

export interface WorkTimeSummary {
  total_duration_ms: number;
  active_duration_ms: number;
  paused_duration_ms: number;
  break_count: number;
  events: WorkTimeLog[];
  breaks: WorkBreak[];
}

/**
 * Iniciar cronómetro de trabajo para un ticket
 */
export async function startWorkTimer(
  ticketId: string,
  technicianId: string
) {
  const { hasSupabaseEnv } = await import('./supabase');
  
  // Si Supabase no está configurado, solo retornar sin error
  if (!hasSupabaseEnv) {
    console.log('Work timer started (offline mode):', ticketId);
    return;
  }

  try {
    const now = new Date().toISOString();

    // Actualizar ticket
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({ work_started_at: now, status: 'in_progress' })
      .eq('id', ticketId);

    if (ticketError) throw ticketError;

    // Registrar evento
    const { error: logError } = await supabase
      .from('work_time_logs')
      .insert([{
        ticket_id: ticketId,
        technician_id: technicianId,
        event_type: 'started',
        timestamp: now,
        notes: 'Trabajo iniciado por técnico',
      }]);

    if (logError) throw logError;
  } catch (err) {
    console.error('Error in startWorkTimer:', err);
    // No lanzar error, permitir que continúe en modo offline
  }
}

/**
 * Pausar cronómetro (registra break)
 */
export async function pauseWorkTimer(
  ticketId: string,
  technicianId: string,
  breakReason?: string
) {
  const { hasSupabaseEnv } = await import('./supabase');
  
  // Si Supabase no está configurado, solo retornar sin error
  if (!hasSupabaseEnv) {
    console.log('Work timer paused (offline mode):', ticketId, breakReason);
    return;
  }

  try {
    const breakStartTime = new Date().toISOString();

    // Crear registro de pausa
    const { error: breakError } = await supabase
      .from('work_breaks')
      .insert([{
        ticket_id: ticketId,
        technician_id: technicianId,
        break_start: breakStartTime,
        break_reason: breakReason,
      }]);

    if (breakError) throw breakError;

    // Registrar evento
    const { error: logError } = await supabase
      .from('work_time_logs')
      .insert([{
        ticket_id: ticketId,
        technician_id: technicianId,
        event_type: 'paused',
        timestamp: breakStartTime,
        notes: breakReason,
      }]);

    if (logError) throw logError;
  } catch (err) {
    console.error('Error in pauseWorkTimer:', err);
    // No lanzar error
  }
}

/**
 * Reanudar cronómetro (finalizar break y calcular duración)
 */
export async function resumeWorkTimer(
  ticketId: string,
  technicianId: string
) {
  const { hasSupabaseEnv } = await import('./supabase');
  
  // Si Supabase no está configurado, solo retornar sin error
  if (!hasSupabaseEnv) {
    console.log('Work timer resumed (offline mode):', ticketId);
    return;
  }

  try {
    const resumeTime = new Date().toISOString();

    // Obtener último break activo
    const { data: lastBreak, error: breakFetchError } = await supabase
      .from('work_breaks')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('break_end', null)
      .order('break_start', { ascending: false })
      .limit(1)
      .single();

    if (breakFetchError && breakFetchError.code !== 'PGRST116') {
      throw breakFetchError;
    }

    if (lastBreak) {
      // Calcular duración del break en milisegundos
      const breakStart = new Date(lastBreak.break_start).getTime();
      const resumeTs = new Date(resumeTime).getTime();
      const breakDurationMs = resumeTs - breakStart;

      // Actualizar break con fin y duración
      const { error: breakUpdateError } = await supabase
        .from('work_breaks')
        .update({
          break_end: resumeTime,
          break_duration_ms: breakDurationMs,
        })
        .eq('id', lastBreak.id);

      if (breakUpdateError) throw breakUpdateError;
    }

    // Registrar evento de reanudación
    const { error: logError } = await supabase
      .from('work_time_logs')
      .insert([{
        ticket_id: ticketId,
        technician_id: technicianId,
        event_type: 'resumed',
        timestamp: resumeTime,
        notes: 'Trabajo reanudado',
      }]);

    if (logError) throw logError;
  } catch (err) {
    console.error('Error in resumeWorkTimer:', err);
    // No lanzar error
  }
}

/**
 * Finalizar trabajo y calcular duraciones totales
 */
export async function completeWorkTimer(
  ticketId: string,
  technicianId: string,
  notes?: string,
  completionType: 'not_completed' | 'work_order' = 'work_order'
) {
  const { hasSupabaseEnv } = await import('./supabase');
  
  // Si Supabase no está configurado, solo retornar sin error
  if (!hasSupabaseEnv) {
    console.log('Work timer completed (offline mode):', ticketId, completionType);
    return;
  }

  try {
    const endTime = new Date().toISOString();

    // Asegurar que no haya break abierto
    const { data: openBreak } = await supabase
      .from('work_breaks')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('break_end', null)
      .single();

    if (openBreak) {
      await resumeWorkTimer(ticketId, technicianId);
    }

    // Determinar estado final basado en tipo de finalización
    const finalStatus = completionType === 'not_completed' ? 'pending' : 'completed';
    
    // Actualizar ticket
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        work_ended_at: endTime,
        status: finalStatus,
        completion_type: completionType,
        // Si es no completado, limpiar asignación para que esté disponible para reasignar
        ...(completionType === 'not_completed' && { technician_id: '' }),
      })
      .eq('id', ticketId);

    if (ticketError) throw ticketError;

    // Si es orden de soporte, crear entrada correspondiente
    if (completionType === 'work_order') {
      const { error: woError } = await supabase
        .from('work_orders')
        .insert([{
          ticket_id: ticketId,
          technician_id: technicianId,
          created_at: endTime,
          status: 'pending',
          description: notes || 'Orden de soporte generada automáticamente',
        }]);

      if (woError && woError.code !== 'PGRST110') { // PGRST110 = tabla no existe
        console.warn('No se pudo crear orden de soporte:', woError);
      }
    }

    // Registrar evento
    const { error: logError } = await supabase
      .from('work_time_logs')
      .insert([{
        ticket_id: ticketId,
        technician_id: technicianId,
        event_type: 'completed',
        timestamp: endTime,
        notes: notes || `Trabajo ${completionType === 'not_completed' ? 'marcado como no completado' : 'completado con orden de soporte'}`,
      }]);

    if (logError) throw logError;
  } catch (err) {
    console.error('Error in completeWorkTimer:', err);
    // No lanzar error
  }
}

/**
 * Obtener resumen completo de tiempos de trabajo
 */
export async function getWorkTimeSummary(ticketId: string): Promise<WorkTimeSummary> {
  const { hasSupabaseEnv } = await import('./supabase');
  
  // Si Supabase no está configurado, retornar valores por defecto
  if (!hasSupabaseEnv) {
    console.log('getWorkTimeSummary (offline mode):', ticketId);
    return {
      total_duration_ms: 0,
      active_duration_ms: 0,
      paused_duration_ms: 0,
      break_count: 0,
      events: [],
      breaks: [],
    };
  }

  try {
    // Obtener ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('work_started_at, work_ended_at, work_duration_ms, active_duration_ms, paused_duration_ms')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw ticketError;

    // Obtener logs
    const { data: logs, error: logsError } = await supabase
      .from('work_time_logs')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('timestamp', { ascending: true });

    if (logsError) throw logsError;

    // Obtener breaks
    const { data: breaks, error: breaksError } = await supabase
      .from('work_breaks')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('break_start', { ascending: true });

    if (breaksError) throw breaksError;

    return {
      total_duration_ms: ticket?.work_duration_ms || 0,
      active_duration_ms: ticket?.active_duration_ms || 0,
      paused_duration_ms: ticket?.paused_duration_ms || 0,
      break_count: (breaks || []).length,
      events: logs || [],
      breaks: breaks || [],
    };
  } catch (err) {
    console.error('Error in getWorkTimeSummary:', err);
    // Retornar valores por defecto en caso de error
    return {
      total_duration_ms: 0,
      active_duration_ms: 0,
      paused_duration_ms: 0,
      break_count: 0,
      events: [],
      breaks: [],
    };
  }
}

/**
 * Obtener cronómetro actual en vivo (si está en progreso)
 */
export async function getLiveWorkTimer(ticketId: string): Promise<{
  isRunning: boolean;
  elapsedMs: number;
  startTime?: Date;
  lastEvent?: 'started' | 'paused' | 'resumed' | 'completed';
}> {
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('work_started_at, work_ended_at, status')
    .eq('id', ticketId)
    .single();

  if (error) throw error;

  if (!ticket?.work_started_at) {
    return { isRunning: false, elapsedMs: 0 };
  }

  const isRunning = !ticket.work_ended_at && ticket.status !== 'completed';
  const startTime = new Date(ticket.work_started_at);
  const now = new Date();

  let elapsedMs = now.getTime() - startTime.getTime();

  // Restar tiempo de breaks activos
  if (isRunning) {
    const { data: openBreak } = await supabase
      .from('work_breaks')
      .select('*')
      .eq('ticket_id', ticketId)
      .is('break_end', null)
      .single();

    if (openBreak) {
      const breakStart = new Date(openBreak.break_start).getTime();
      elapsedMs -= (now.getTime() - breakStart);
    }
  }

  return {
    isRunning,
    elapsedMs: Math.max(0, elapsedMs),
    startTime,
    lastEvent: isRunning ? 'started' : 'completed',
  };
}

/**
 * Formatear milisegundos a formato legible
 */
export function formatDuration(ms: number): {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  formatted: string;
} {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  // Formato limpio: MM:SS (solo minutos y segundos, sin milisegundos)
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const formatted = `${totalMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

  return { hours, minutes, seconds, milliseconds, formatted };
}

/**
 * Calcular tiempo promedio de trabajo por técnico
 */
export async function getTechnicianAverageWorkTime(
  technicianId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('work_duration_ms, active_duration_ms')
    .eq('technician_id', technicianId)
    .gte('work_ended_at', startDate.toISOString())
    .not('work_ended_at', 'is', null);

  if (error) throw error;

  if (!tickets || tickets.length === 0) {
    return {
      average_total_ms: 0,
      average_active_ms: 0,
      total_tickets: 0,
    };
  }

  const totalDuration = tickets.reduce((sum: number, t: any) => sum + (t.work_duration_ms || 0), 0);
  const totalActive = tickets.reduce((sum: number, t: any) => sum + (t.active_duration_ms || 0), 0);

  return {
    average_total_ms: Math.round(totalDuration / tickets.length),
    average_active_ms: Math.round(totalActive / tickets.length),
    total_tickets: tickets.length,
  };
}

/**
 * Obtener estadísticas de breaks por técnico
 */
export async function getTechnicianBreakStats(
  technicianId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: breaks, error } = await supabase
    .from('work_breaks')
    .select('break_duration_ms, break_reason')
    .eq('technician_id', technicianId)
    .gte('created_at', startDate.toISOString());

  if (error) throw error;

  if (!breaks || breaks.length === 0) {
    return {
      total_breaks: 0,
      total_break_time_ms: 0,
      average_break_duration_ms: 0,
      break_reasons: {},
    };
  }

  const totalBreakTime = breaks.reduce((sum: number, b: any) => sum + (b.break_duration_ms || 0), 0);
  const breakReasons: { [key: string]: number } = {};

  breaks.forEach((b: any) => {
    const reason = b.break_reason || 'Sin especificar';
    breakReasons[reason] = (breakReasons[reason] || 0) + 1;
  });

  return {
    total_breaks: breaks.length,
    total_break_time_ms: totalBreakTime,
    average_break_duration_ms: Math.round(totalBreakTime / breaks.length),
    break_reasons: breakReasons,
  };
}

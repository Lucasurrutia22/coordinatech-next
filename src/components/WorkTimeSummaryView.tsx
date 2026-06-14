'use client';

import { useEffect, useState } from 'react';
import { Clock, Pause, AlertCircle } from 'lucide-react';
import {
  getWorkTimeSummary,
  formatDuration,
  type WorkTimeSummary,
} from '@/lib/timeTracking';

interface WorkTimeSummaryViewProps {
  ticketId: string;
  showDetails?: boolean;
}

export function WorkTimeSummaryView({ ticketId, showDetails = true }: WorkTimeSummaryViewProps) {
  const [summary, setSummary] = useState<WorkTimeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await getWorkTimeSummary(ticketId);
        setSummary(data);
      } catch (err) {
        console.error('Error loading work summary:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [ticketId]);

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>;
  }

  if (!summary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-yellow-700">No hay datos de tiempo de trabajo registrados.</p>
      </div>
    );
  }

  const totalDur = formatDuration(summary.total_duration_ms);
  const activeDur = formatDuration(summary.active_duration_ms);
  const pausedDur = formatDuration(summary.paused_duration_ms);

  return (
    <div className="space-y-4">
      {/* Resumen en tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tiempo Total */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-900">Tiempo Total</p>
          </div>
          <p className="text-2xl font-mono font-bold text-blue-600">{totalDur.formatted}</p>
          <p className="text-xs text-blue-700 mt-1">
            {totalDur.hours}h {totalDur.minutes}m {totalDur.seconds}s
          </p>
        </div>

        {/* Tiempo Activo */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-900">Tiempo Activo</p>
          </div>
          <p className="text-2xl font-mono font-bold text-green-600">{activeDur.formatted}</p>
          <p className="text-xs text-green-700 mt-1">
            {activeDur.hours}h {activeDur.minutes}m {activeDur.seconds}s
          </p>
        </div>

        {/* Tiempo en Pausa */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pause className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-900">En Pausas</p>
          </div>
          <p className="text-2xl font-mono font-bold text-yellow-600">{pausedDur.formatted}</p>
          <p className="text-xs text-yellow-700 mt-1">
            {pausedDur.hours}h {pausedDur.minutes}m {pausedDur.seconds}s ({summary.break_count} pausas)
          </p>
        </div>
      </div>

      {/* Detalles si está habilitado */}
      {showDetails && (
        <>
          {/* Timeline de eventos */}
          {summary.events.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Timeline de Eventos</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {summary.events.map((event, idx) => {
                  const time = new Date(event.timestamp);
                  const prevEvent = summary.events[idx - 1];
                  const durationSinceLast = prevEvent
                    ? new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime()
                    : 0;

                  const eventIcons: Record<string, string> = {
                    started: '▶️',
                    paused: '⏸️',
                    resumed: '▶️',
                    completed: '✅',
                  };

                  const eventLabels: Record<string, string> = {
                    started: 'Trabajo iniciado',
                    paused: 'Trabajo pausado',
                    resumed: 'Trabajo reanudado',
                    completed: 'Trabajo completado',
                  };

                  return (
                    <div key={event.id} className="flex gap-3 text-sm border-l-2 border-gray-300 pl-3 py-1">
                      <div className="text-lg">{eventIcons[event.event_type]}</div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-medium text-gray-900">{eventLabels[event.event_type]}</p>
                          <p className="text-gray-600 font-mono text-xs">
                            {time.toLocaleTimeString('es-CL')}
                          </p>
                        </div>
                        {event.notes && (
                          <p className="text-gray-600 text-xs italic">{event.notes}</p>
                        )}
                        {durationSinceLast > 0 && (
                          <p className="text-gray-500 text-xs">
                            +{formatDuration(durationSinceLast).formatted}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalles de pausas */}
          {summary.breaks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Pausas Registradas ({summary.breaks.length})</h3>
              <div className="space-y-3">
                {summary.breaks.map((breakRecord, idx) => {
                  const breakDur = breakRecord.break_duration_ms
                    ? formatDuration(breakRecord.break_duration_ms)
                    : null;
                  const breakStart = new Date(breakRecord.break_start);

                  return (
                    <div key={breakRecord.id} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-yellow-900">Pausa #{idx + 1}</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Inicio: {breakStart.toLocaleString('es-CL')}
                          </p>
                          {breakRecord.break_reason && (
                            <p className="text-xs text-yellow-700 mt-1">
                              Razón: {breakRecord.break_reason}
                            </p>
                          )}
                        </div>
                        {breakDur && (
                          <div className="text-right">
                            <p className="font-mono font-bold text-yellow-600">
                              {breakDur.formatted}
                            </p>
                            <p className="text-xs text-yellow-700">
                              {breakDur.minutes}m {breakDur.seconds}s
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-900 mb-3">Estadísticas de Eficiencia</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-indigo-700 text-xs mb-1">Eficiencia</p>
                <p className="text-lg font-bold text-indigo-600">
                  {summary.total_duration_ms > 0
                    ? ((summary.active_duration_ms / summary.total_duration_ms) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div>
                <p className="text-indigo-700 text-xs mb-1">Total Pausas</p>
                <p className="text-lg font-bold text-indigo-600">{summary.break_count}</p>
              </div>
              <div>
                <p className="text-indigo-700 text-xs mb-1">Promedio Pausa</p>
                <p className="text-lg font-bold text-indigo-600">
                  {summary.break_count > 0
                    ? formatDuration(
                        Math.round(summary.paused_duration_ms / summary.break_count)
                      ).formatted
                    : '--'}
                </p>
              </div>
              <div>
                <p className="text-indigo-700 text-xs mb-1">Eventos Registrados</p>
                <p className="text-lg font-bold text-indigo-600">{summary.events.length}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

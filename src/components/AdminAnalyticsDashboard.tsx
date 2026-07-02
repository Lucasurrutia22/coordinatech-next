'use client';

import { useEffect, useState } from 'react';
import { BarChart, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  getTechnicianAverageWorkTime,
  getTechnicianBreakStats,
  formatDuration,
} from '@/lib/timeTracking';

interface TechnicianStat {
  id: string;
  name: string;
  average_total_ms: number;
  average_active_ms: number;
  total_tickets: number;
  total_breaks: number;
  total_break_time_ms: number;
  average_break_duration_ms: number;
}

interface AdminAnalyticsProps {
  days?: number;
}

export function AdminAnalyticsDashboard({ days = 30 }: AdminAnalyticsProps) {
  const [technicians, setTechnicians] = useState<TechnicianStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Obtener técnicos
      const { data: techs, error: techError } = await supabase
        .from('technicians')
        .select('id, name')
        .order('name');

      if (techError) throw techError;

      // Cargar estadísticas para cada técnico
      const stats: TechnicianStat[] = [];
      for (const tech of techs || []) {
        const [workStats, breakStats] = await Promise.all([
          getTechnicianAverageWorkTime(tech.id, days),
          getTechnicianBreakStats(tech.id, days),
        ]);

        stats.push({
          id: tech.id,
          name: tech.name,
          average_total_ms: workStats.average_total_ms,
          average_active_ms: workStats.average_active_ms,
          total_tickets: workStats.total_tickets,
          total_breaks: breakStats.total_breaks,
          total_break_time_ms: breakStats.total_break_time_ms,
          average_break_duration_ms: breakStats.average_break_duration_ms,
        });
      }

      setTechnicians(stats);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-stone-100 border border-[#EAEAEA] h-64 rounded-xl"></div>;
  }

  // Calcular totales
  const totalTickets = technicians.reduce((sum, t) => sum + t.total_tickets, 0);
  const totalBreaks = technicians.reduce((sum, t) => sum + t.total_breaks, 0);
  const totalBreakTime = technicians.reduce((sum, t) => sum + t.total_break_time_ms, 0);
  const averageEfficiency =
    technicians.length > 0
      ? technicians.reduce((sum, t) => {
          if (t.average_total_ms === 0) return sum;
          return sum + (t.average_active_ms / t.average_total_ms) * 100;
        }, 0) / technicians.length
      : 0;

  const breakTimeDur = formatDuration(totalBreakTime);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500 mb-2">Analitica Operativa</p>
        <h1 className="text-3xl font-semibold text-stone-900">Analisis Detallado de Tiempos</h1>
        <p className="text-stone-600 mt-1">Periodo: ultimos {days} dias</p>
      </div>

      {/* KPIs de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Total Tickets</p>
              <p className="text-3xl font-semibold text-stone-900 mt-2">{totalTickets}</p>
            </div>
            <BarChart className="w-8 h-8 text-stone-400" />
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Eficiencia Promedio</p>
              <p className="text-3xl font-semibold text-stone-900 mt-2">{averageEfficiency.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-stone-400" />
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Total Pausas</p>
              <p className="text-3xl font-semibold text-stone-900 mt-2">{totalBreaks}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-stone-400" />
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">Tiempo en Pausas</p>
              <p className="text-2xl font-semibold text-stone-900 mt-2 font-mono">
                {breakTimeDur.formatted}
              </p>
            </div>
            <Clock className="w-8 h-8 text-stone-400" />
          </div>
        </div>
      </div>

      {/* Tabla de técnicos */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FBFBFA] border-b border-[#EAEAEA]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Tiempo Promedio Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Tiempo Activo Promedio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Eficiencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Total Pausas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-stone-700 uppercase">
                  Tiempo Pausa Promedio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]">
              {technicians.map(tech => {
                const avgTotal = formatDuration(tech.average_total_ms);
                const avgActive = formatDuration(tech.average_active_ms);
                const avgBreak = formatDuration(tech.average_break_duration_ms);
                const efficiency =
                  tech.average_total_ms > 0
                    ? ((tech.average_active_ms / tech.average_total_ms) * 100).toFixed(1)
                    : '0.0';

                return (
                  <tr
                    key={tech.id}
                    className="hover:bg-[#FBFBFA] cursor-pointer"
                    onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-stone-900">{tech.name}</td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">{tech.total_tickets}</td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">
                      {avgTotal.formatted}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">
                      {avgActive.formatted}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-stone-200 rounded h-2">
                          <div
                            className="bg-emerald-700 h-2 rounded"
                            style={{ width: `${Math.min(parseFloat(efficiency), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-stone-900">{efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">{tech.total_breaks}</td>
                    <td className="px-6 py-4 text-sm text-stone-600 font-mono">
                      {avgBreak.formatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalles de técnico seleccionado */}
      {selectedTech && (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
          {(() => {
            const tech = technicians.find(t => t.id === selectedTech);
            if (!tech) return null;

            const avgTotal = formatDuration(tech.average_total_ms);
            const avgActive = formatDuration(tech.average_active_ms);
            const avgBreak = formatDuration(tech.average_break_duration_ms);
            const totalBreakMs =
              tech.total_breaks > 0 ? tech.average_break_duration_ms * tech.total_breaks : 0;
            const totalBreakDur = formatDuration(totalBreakMs);

            return (
              <div>
                <h3 className="text-lg font-semibold text-stone-900 mb-4">{tech.name} - Analisis Detallado</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Tickets Completados</p>
                    <p className="text-2xl font-semibold text-stone-900">{tech.total_tickets}</p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Tiempo Total Promedio</p>
                    <p className="text-lg font-mono font-semibold text-stone-900">
                      {avgTotal.formatted}
                    </p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Tiempo Activo Promedio</p>
                    <p className="text-lg font-mono font-semibold text-emerald-700">
                      {avgActive.formatted}
                    </p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Eficiencia</p>
                    <p className="text-2xl font-semibold text-stone-900">
                      {tech.average_total_ms > 0
                        ? ((tech.average_active_ms / tech.average_total_ms) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Total Pausas</p>
                    <p className="text-2xl font-semibold text-stone-900">{tech.total_breaks}</p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Pausa Promedio</p>
                    <p className="text-lg font-mono font-semibold text-stone-900">
                      {avgBreak.formatted}
                    </p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Tiempo Total en Pausas</p>
                    <p className="text-lg font-mono font-semibold text-stone-900">
                      {totalBreakDur.formatted}
                    </p>
                  </div>
                  <div className="bg-[#FBFBFA] rounded-lg p-3 border border-[#EAEAEA]">
                    <p className="text-xs text-stone-700 mb-1">Tiempo Muerto por Ticket</p>
                    <p className="text-lg font-mono font-semibold text-rose-700">
                      {tech.average_total_ms - tech.average_active_ms > 0
                        ? formatDuration(tech.average_total_ms - tech.average_active_ms).formatted
                        : '0:00:00.000'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

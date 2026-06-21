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
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
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
        <h1 className="text-3xl font-bold text-gray-900">Análisis Detallado de Tiempos</h1>
        <p className="text-gray-600 mt-1">Período: últimos {days} días</p>
      </div>

      {/* KPIs de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Total Tickets</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{totalTickets}</p>
            </div>
            <BarChart className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">Eficiencia Promedio</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{averageEfficiency.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-900">Total Pausas</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{totalBreaks}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-900">Tiempo en Pausas</p>
              <p className="text-2xl font-bold text-purple-600 mt-2 font-mono">
                {breakTimeDur.formatted}
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Tabla de técnicos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Tiempo Promedio Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Tiempo Activo Promedio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Eficiencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Total Pausas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Tiempo Pausa Promedio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
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
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tech.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{tech.total_tickets}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {avgTotal.formatted}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {avgActive.formatted}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${Math.min(parseFloat(efficiency), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{tech.total_breaks}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
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
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
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
                <h3 className="text-lg font-bold text-indigo-900 mb-4">{tech.name} - Análisis Detallado</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Tickets Completados</p>
                    <p className="text-2xl font-bold text-indigo-600">{tech.total_tickets}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Tiempo Total Promedio</p>
                    <p className="text-lg font-mono font-bold text-indigo-600">
                      {avgTotal.formatted}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Tiempo Activo Promedio</p>
                    <p className="text-lg font-mono font-bold text-green-600">
                      {avgActive.formatted}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Eficiencia</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {tech.average_total_ms > 0
                        ? ((tech.average_active_ms / tech.average_total_ms) * 100).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Total Pausas</p>
                    <p className="text-2xl font-bold text-yellow-600">{tech.total_breaks}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Pausa Promedio</p>
                    <p className="text-lg font-mono font-bold text-yellow-600">
                      {avgBreak.formatted}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Tiempo Total en Pausas</p>
                    <p className="text-lg font-mono font-bold text-purple-600">
                      {totalBreakDur.formatted}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-700 mb-1">Tiempo Muerto por Ticket</p>
                    <p className="text-lg font-mono font-bold text-red-600">
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

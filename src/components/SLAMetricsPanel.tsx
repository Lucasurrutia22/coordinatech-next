'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSLA } from '@/lib/slaCalculations';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface SLAMetric {
  id: string;
  description: string;
  client_name: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  created_at: string;
  sla_percent: number;
  sla_status: 'critical' | 'warning' | 'ok' | 'completed';
}

interface SLAStats {
  totalTickets: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  completedCount: number;
  averageSLA: number;
}

export function SLAMetricsPanel() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!tickets) {
        setMetrics([]);
        return;
      }

      // Calcular SLA para cada ticket
      const slaMetrics: SLAMetric[] = tickets.map(ticket => {
        const sla = calculateSLA(new Date(ticket.created_at), ticket.priority, ticket.status);
        return {
          id: ticket.id,
          description: ticket.description,
          client_name: ticket.client_name || 'Sin cliente',
          priority: ticket.priority,
          status: ticket.status,
          created_at: ticket.created_at,
          sla_percent: sla.percentRemaining,
          sla_status: sla.status,
        };
      });

      setMetrics(slaMetrics);

      // Calcular estadísticas
      const criticalCount = slaMetrics.filter(m => m.sla_status === 'critical').length;
      const warningCount = slaMetrics.filter(m => m.sla_status === 'warning').length;
      const okCount = slaMetrics.filter(m => m.sla_status === 'ok').length;
      const completedCount = slaMetrics.filter(m => m.sla_status === 'completed').length;
      const averageSLA = slaMetrics.length > 0
        ? slaMetrics.reduce((sum, m) => sum + m.sla_percent, 0) / slaMetrics.length
        : 0;

      setStats({
        totalTickets: slaMetrics.length,
        criticalCount,
        warningCount,
        okCount,
        completedCount,
        averageSLA,
      });
    } catch (err) {
      console.error('Error loading SLA metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>;
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">No hay datos de SLA disponibles</p>
      </div>
    );
  }

  // Determinar color basado en porcentaje
  const getSLAColor = (percent: number) => {
    if (percent >= 70) return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', badge: 'bg-green-600' };
    if (percent >= 50) return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-600' };
    return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', badge: 'bg-red-600' };
  };

  const overallColor = getSLAColor(stats.averageSLA);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-600 font-medium mb-2">TOTAL TICKETS</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalTickets}</p>
        </div>

        {/* Critical */}
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-red-700 font-medium mb-2">🔴 CRÍTICO</p>
          <p className="text-3xl font-bold text-red-600">{stats.criticalCount}</p>
          <p className="text-xs text-red-600 mt-1">{((stats.criticalCount / stats.totalTickets) * 100).toFixed(1)}%</p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-yellow-700 font-medium mb-2">⚠️ ALERTA</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.warningCount}</p>
          <p className="text-xs text-yellow-600 mt-1">{((stats.warningCount / stats.totalTickets) * 100).toFixed(1)}%</p>
        </div>

        {/* OK */}
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-blue-700 font-medium mb-2">✓ EN TIEMPO</p>
          <p className="text-3xl font-bold text-blue-600">{stats.okCount}</p>
          <p className="text-xs text-blue-600 mt-1">{((stats.okCount / stats.totalTickets) * 100).toFixed(1)}%</p>
        </div>

        {/* Completed */}
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-green-700 font-medium mb-2">✅ COMPLETADO</p>
          <p className="text-3xl font-bold text-green-600">{stats.completedCount}</p>
          <p className="text-xs text-green-600 mt-1">{((stats.completedCount / stats.totalTickets) * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* SLA Promedio - Barra Grande */}
      <div className={`${overallColor.bg} border-2 ${overallColor.border} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">CUMPLIMIENTO SLA PROMEDIO</p>
            <p className={`text-5xl font-bold ${overallColor.text}`}>
              {stats.averageSLA.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            {stats.averageSLA >= 70 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-12 h-12 text-green-600" />
                <p className="text-green-700 font-bold text-lg">ÓPTIMO</p>
              </div>
            )}
            {stats.averageSLA >= 50 && stats.averageSLA < 70 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-12 h-12 text-yellow-600" />
                <p className="text-yellow-700 font-bold text-lg">ALERTA</p>
              </div>
            )}
            {stats.averageSLA < 50 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-12 h-12 text-red-600" />
                <p className="text-red-700 font-bold text-lg">CRÍTICO</p>
              </div>
            )}
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-300 rounded-full h-8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 flex items-center justify-center font-bold text-white text-sm ${overallColor.badge}`}
            style={{ width: `${Math.min(stats.averageSLA, 100)}%` }}
          >
            {stats.averageSLA.toFixed(1)}%
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <p className="text-gray-600">Meta SLA</p>
            <p className="font-bold text-gray-900">95%</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Diferencia</p>
            <p className={`font-bold ${stats.averageSLA >= 95 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats.averageSLA - 95).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Tendencia</p>
            <p className={`font-bold ${stats.averageSLA >= 70 ? 'text-green-600' : stats.averageSLA >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stats.averageSLA >= 70 ? '↑ Buena' : stats.averageSLA >= 50 ? '→ Media' : '↓ Baja'}
            </p>
          </div>
        </div>
      </div>

      {/* Distribución de Estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-600 font-medium mb-3">Distribución por Estado</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Crítico</span>
              <div className="w-20 bg-gray-200 rounded h-2">
                <div className="bg-red-600 h-2 rounded" style={{ width: `${stats.totalTickets > 0 ? (stats.criticalCount / stats.totalTickets) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Alerta</span>
              <div className="w-20 bg-gray-200 rounded h-2">
                <div className="bg-yellow-600 h-2 rounded" style={{ width: `${stats.totalTickets > 0 ? (stats.warningCount / stats.totalTickets) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">En Tiempo</span>
              <div className="w-20 bg-gray-200 rounded h-2">
                <div className="bg-blue-600 h-2 rounded" style={{ width: `${stats.totalTickets > 0 ? (stats.okCount / stats.totalTickets) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Completado</span>
              <div className="w-20 bg-gray-200 rounded h-2">
                <div className="bg-green-600 h-2 rounded" style={{ width: `${stats.totalTickets > 0 ? (stats.completedCount / stats.totalTickets) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Tickets Críticos */}
      {stats.criticalCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-red-50 border-b border-red-200 px-6 py-4">
            <h3 className="font-bold text-red-900 flex items-center gap-2">
              🔴 {stats.criticalCount} TICKETS EN ESTADO CRÍTICO
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">DESCRIPCIÓN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">CLIENTE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">PRIORIDAD</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.filter(m => m.sla_status === 'critical').slice(0, 5).map(metric => (
                  <tr key={metric.id} className="hover:bg-red-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{metric.description.substring(0, 40)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{metric.client_name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        metric.priority === 'high' ? 'bg-red-100 text-red-800' :
                        metric.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {metric.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-red-600">{metric.sla_percent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

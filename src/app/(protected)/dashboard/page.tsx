'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DashboardKPIs, type DashboardMetrics } from '@/components/DashboardKPIs';
import { SLAAlertBadge, SLAProgressBar } from '@/components/SLAAlertBadge';
import { calculateAggregatedMetrics, calculateSLA, getCriticalAlerts } from '@/lib/slaCalculations';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface Ticket {
  id: string;
  description: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'not_completed';
  updated_at?: string;
  technician_id?: string;
  client_name?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [criticalTickets, setCriticalTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Recargar cada 30 segundos para alertas en tiempo real
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Obtener tickets (con simulación de datos si es necesario)
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      const ticketsData = (tickets || []) as Ticket[];

      // Calcular métricas agregadas
      const aggregated = calculateAggregatedMetrics(ticketsData);
      setMetrics(aggregated);

      // Obtener tickets críticos
      const critical = getCriticalAlerts(ticketsData);
      setCriticalTickets(critical);

      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Error cargando dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-stone-700"></div>
          <p className="mt-4 text-stone-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white border border-rose-200 rounded-xl p-6 max-w-xl">
          <p className="text-xs uppercase tracking-wide text-rose-700 mb-2">Error de carga</p>
          <p className="text-rose-900">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500 mb-2">Centro de Operaciones</p>
        <h1 className="text-3xl font-semibold text-stone-900">Panel de Control</h1>
        <p className="text-stone-600 mt-1">Monitoreo en tiempo real de SLAs y operaciones</p>
      </div>

      {/* KPIs */}
      {metrics && <DashboardKPIs metrics={metrics} />}

      {/* Alertas críticas */}
      {criticalTickets.length > 0 && (
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-700 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                <span className="bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded-md text-sm">
                  {criticalTickets.length}
                </span>
                Alerta{criticalTickets.length > 1 ? 's' : ''} SLA Crítica{criticalTickets.length > 1 ? 's' : ''}
                <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 text-rose-800">Estado Critico</span>
              </h2>
              <p className="text-stone-600 text-sm mt-1">
                Tickets a menos del 15% de su tiempo SLA. Requieren acción inmediata.
              </p>

              {/* Lista de tickets críticos */}
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {criticalTickets.map((alert, idx) => (
                  <div key={idx} className="bg-[#FBFBFA] border border-[#EAEAEA] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 truncate">{alert.description}</p>
                      <SLAProgressBar percentRemaining={alert.percentRemaining} />
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-semibold text-rose-700">{alert.hoursRemaining}h</p>
                      <p className="text-xs text-stone-600">{alert.percentRemaining.toFixed(0)}% SLA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets próximos a vencer */}
      <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-stone-700" />
          <h2 className="text-lg font-semibold text-stone-900">Monitoreo de SLAs en Tiempo Real</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-emerald-800">Estado Estable</p>
            <p className="text-xs text-emerald-900">Cumplimiento dentro de objetivo.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-amber-800">Estado Alerta</p>
            <p className="text-xs text-amber-900">Riesgo de desvio, requiere seguimiento.</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-rose-800">Estado Critico</p>
            <p className="text-xs text-rose-900">Intervencion inmediata para evitar incumplimiento.</p>
          </div>
        </div>
        <p className="text-sm text-stone-600 mt-4">
          Actualizacion automatica cada 30 segundos. Estados definidos con texto, icono y color para mejorar lectura y accesibilidad.
        </p>
      </div>
    </div>
  );
}

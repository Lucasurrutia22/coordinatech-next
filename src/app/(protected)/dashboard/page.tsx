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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600 mt-1">Monitoreo en tiempo real de SLAs y operaciones</p>
      </div>

      {/* KPIs */}
      {metrics && <DashboardKPIs metrics={metrics} />}

      {/* Alertas críticas */}
      {criticalTickets.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-sm">
                  {criticalTickets.length}
                </span>
                Alerta{criticalTickets.length > 1 ? 's' : ''} SLA Crítica{criticalTickets.length > 1 ? 's' : ''}
              </h2>
              <p className="text-red-700 text-sm mt-1">
                Tickets a menos del 15% de su tiempo SLA. Requieren acción inmediata.
              </p>

              {/* Lista de tickets críticos */}
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {criticalTickets.map((alert, idx) => (
                  <div key={idx} className="bg-white border border-red-100 rounded p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{alert.description}</p>
                      <SLAProgressBar percentRemaining={alert.percentRemaining} />
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-bold text-red-600">{alert.hoursRemaining}h</p>
                      <p className="text-xs text-gray-600">{alert.percentRemaining.toFixed(0)}% SLA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets próximos a vencer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-blue-900">Monitoreo de SLAs en Tiempo Real</h2>
        </div>
        <p className="text-sm text-blue-700">
          El sistema evalúa automáticamente el cumplimiento de niveles de servicio. Las alertas semafóricas se actualizan cada 30 segundos.
          Los tickets en estado crítico (rojo) requieren intervención inmediata para evitar multas por incumplimiento.
        </p>
      </div>
    </div>
  );
}

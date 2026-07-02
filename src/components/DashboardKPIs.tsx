'use client';

import { TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { MetricCard } from './MetricCard';

export interface DashboardMetrics {
  totalTickets: number;
  completedToday: number;
  pendingTickets: number;
  slaComplianceRate: number;
  estimatedLossesPrevented: number;
  avgResolutionTime: number;
  criticalAlertsCount: number;
}

export function DashboardKPIs({ metrics }: { metrics: DashboardMetrics }) {
  const slaHealth = metrics.slaComplianceRate >= 95 ? 'good' : 
                    metrics.slaComplianceRate >= 85 ? 'warning' : 'critical';
  const slaLabel = slaHealth === 'good' ? 'Estable' : slaHealth === 'warning' ? 'Alerta' : 'Critico';
  const slaStateClass =
    slaHealth === 'good'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : slaHealth === 'warning'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Tickets completados hoy */}
      <MetricCard
        className="lg:col-span-2"
        title="Completados Hoy"
        value={metrics.completedToday.toString()}
        icon={<CheckCircle className="w-5 h-5" />}
        trendValue={`${Math.round((metrics.completedToday / Math.max(metrics.totalTickets, 1)) * 100)}%`}
        trend="up"
        accent="#346538"
      />

      {/* Tickets pendientes */}
      <MetricCard
        title="Pendientes"
        value={metrics.pendingTickets.toString()}
        icon={<Clock className="w-5 h-5" />}
        trendValue={`${metrics.pendingTickets} en cola`}
        trend={metrics.pendingTickets > 0 ? 'down' : 'neutral'}
        accent="#956400"
      />

      {/* Cumplimiento SLA */}
      <MetricCard
        title="Cumplimiento SLA"
        value={`${metrics.slaComplianceRate.toFixed(1)}%`}
        icon={<TrendingUp className="w-5 h-5" />}
        trendValue={slaLabel}
        trend={slaHealth === 'good' ? 'up' : slaHealth === 'warning' ? 'neutral' : 'down'}
        accent="#1F6C9F"
      />

      {/* Pérdidas prevenidas */}
      <MetricCard
        className="md:col-span-2 lg:col-span-1"
        title="Ahorros del Mes"
        value={`$${(metrics.estimatedLossesPrevented / 1000).toFixed(0)}K`}
        icon={<DollarSign className="w-5 h-5" />}
        trendValue={`vs $4M potencial`}
        trend="up"
        accent="#1F6C9F"
      />

      {/* Alertas críticas */}
      {metrics.criticalAlertsCount > 0 && (
        <div className="col-span-full bg-white border border-[#EAEAEA] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-stone-900 flex items-center gap-2">
              {metrics.criticalAlertsCount} Alerta{metrics.criticalAlertsCount > 1 ? 's' : ''} Crítica{metrics.criticalAlertsCount > 1 ? 's' : ''}
              <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50 text-rose-800">Estado Critico</span>
            </h3>
            <p className="text-sm text-stone-600">
              {metrics.criticalAlertsCount} ticket{metrics.criticalAlertsCount > 1 ? 's' : ''} está{metrics.criticalAlertsCount > 1 ? 'n' : ''} a menos del 15% del tiempo SLA. Acción inmediata requerida.
            </p>
          </div>
        </div>
      )}

      {/* Tiempo promedio resolución */}
      <div className="col-span-full bg-white border border-[#EAEAEA] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-stone-700">Tiempo Promedio Resolucion</p>
              <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md border ${slaStateClass}`}>
                {slaLabel}
              </span>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{metrics.avgResolutionTime.toFixed(1)}h</p>
          </div>
          <Clock className="w-8 h-8 text-stone-400" />
        </div>
      </div>
    </div>
  );
}

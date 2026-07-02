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
  const slaLabel = slaHealth === 'good' ? 'Estable' : slaHealth === 'warning' ? 'Alerta' : 'Crítico';
  const slaStateClass =
    slaHealth === 'good'
      ? 'bg-[#edf3ec] text-[#346538] border-[#c7dbc3]'
      : slaHealth === 'warning'
        ? 'bg-[#fbf3db] text-[#956400] border-[#f0dea6]'
        : 'bg-[#fdebec] text-[#9f2f2d] border-[#f3c1c1]';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Tickets completados hoy */}
      <MetricCard
        className="lg:col-span-2"
        title="Cerrados hoy"
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
        title="Ahorro estimado"
        value={`$${(metrics.estimatedLossesPrevented / 1000).toFixed(0)}K`}
        icon={<DollarSign className="w-5 h-5" />}
        trendValue={`vs $4M potencial`}
        trend="up"
        accent="#1F6C9F"
      />

      {/* Alertas críticas */}
      {metrics.criticalAlertsCount > 0 && (
        <div className="col-span-full surface-card p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#9f2f2d] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[#111111] flex items-center gap-2">
              {metrics.criticalAlertsCount} alerta{metrics.criticalAlertsCount > 1 ? 's' : ''} crítica{metrics.criticalAlertsCount > 1 ? 's' : ''}
              <span className="text-[11px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-md border border-[#f3c1c1] bg-[#fdebec] text-[#9f2f2d]">Requiere atención</span>
            </h3>
            <p className="text-sm text-[#787774]">
              {metrics.criticalAlertsCount} ticket{metrics.criticalAlertsCount > 1 ? 's' : ''} está{metrics.criticalAlertsCount > 1 ? 'n' : ''} a menos del 15% del tiempo SLA. Acción inmediata requerida.
            </p>
          </div>
        </div>
      )}

      {/* Tiempo promedio resolución */}
      <div className="col-span-full surface-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[#2f3437]">Tiempo promedio de resolución</p>
              <span className={`text-[11px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-md border ${slaStateClass}`}>
                {slaLabel}
              </span>
            </div>
            <p className="text-2xl font-semibold tracking-[-0.03em] text-[#111111]">{metrics.avgResolutionTime.toFixed(1)}h</p>
          </div>
          <Clock className="w-8 h-8 text-[#9a9791]" />
        </div>
      </div>
    </div>
  );
}

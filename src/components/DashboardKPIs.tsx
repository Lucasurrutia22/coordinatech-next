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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Tickets completados hoy */}
      <MetricCard
        title="Completados Hoy"
        value={metrics.completedToday.toString()}
        icon={<CheckCircle className="w-5 h-5" />}
        trendValue={`${Math.round((metrics.completedToday / Math.max(metrics.totalTickets, 1)) * 100)}%`}
      />

      {/* Tickets pendientes */}
      <MetricCard
        title="Pendientes"
        value={metrics.pendingTickets.toString()}
        icon={<Clock className="w-5 h-5" />}
        trendValue={`${metrics.pendingTickets} en cola`}
      />

      {/* Cumplimiento SLA */}
      <MetricCard
        title="Cumplimiento SLA"
        value={`${metrics.slaComplianceRate.toFixed(1)}%`}
        icon={<TrendingUp className="w-5 h-5" />}
        trendValue={slaHealth === 'good' ? 'Óptimo' : slaHealth === 'warning' ? 'Alerta' : 'Crítico'}
      />

      {/* Pérdidas prevenidas */}
      <MetricCard
        title="Ahorros del Mes"
        value={`$${(metrics.estimatedLossesPrevented / 1000).toFixed(0)}K`}
        icon={<DollarSign className="w-5 h-5" />}
        trendValue={`vs $4M potencial`}
      />

      {/* Alertas críticas */}
      {metrics.criticalAlertsCount > 0 && (
        <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">
              {metrics.criticalAlertsCount} Alerta{metrics.criticalAlertsCount > 1 ? 's' : ''} Crítica{metrics.criticalAlertsCount > 1 ? 's' : ''}
            </h3>
            <p className="text-sm text-red-700">
              {metrics.criticalAlertsCount} ticket{metrics.criticalAlertsCount > 1 ? 's' : ''} está{metrics.criticalAlertsCount > 1 ? 'n' : ''} a menos del 15% del tiempo SLA. Acción inmediata requerida.
            </p>
          </div>
        </div>
      )}

      {/* Tiempo promedio resolución */}
      <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Tiempo Promedio Resolución</p>
            <p className="text-2xl font-bold text-blue-600">{metrics.avgResolutionTime.toFixed(1)}h</p>
          </div>
          <Clock className="w-8 h-8 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

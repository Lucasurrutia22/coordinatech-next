'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSLA } from '@/lib/slaCalculations';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';

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

interface TicketData {
  id: string;
  description: string;
  client_name?: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  created_at: string;
}

interface SLAStats {
  totalTickets: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  completedCount: number;
  averageSLA: number;
}

function getSLAState(percent: number) {
  if (percent >= 70) {
    return {
      label: 'Estable',
      text: '#346538',
      bg: '#edf3ec',
      border: '#c7dbc3',
      trend: 'up' as const,
    };
  }

  if (percent >= 50) {
    return {
      label: 'Alerta',
      text: '#956400',
      bg: '#fbf3db',
      border: '#f0dea6',
      trend: 'neutral' as const,
    };
  }

  return {
    label: 'Critico',
    text: '#9f2f2d',
    bg: '#fdebec',
    border: '#f3c1c1',
    trend: 'down' as const,
  };
}

function toPercent(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function SLAMetricsPanel() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMetrics();
    const interval = setInterval(() => {
      void loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadMetrics() {
    try {
      setError(null);
      const { data: tickets, error: queryError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      if (!tickets) {
        setMetrics([]);
        setStats({
          totalTickets: 0,
          criticalCount: 0,
          warningCount: 0,
          okCount: 0,
          completedCount: 0,
          averageSLA: 0,
        });
        return;
      }

      const slaMetrics: SLAMetric[] = (tickets as TicketData[]).map((ticket: TicketData) => {
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

      const criticalCount = slaMetrics.filter((item) => item.sla_status === 'critical').length;
      const warningCount = slaMetrics.filter((item) => item.sla_status === 'warning').length;
      const okCount = slaMetrics.filter((item) => item.sla_status === 'ok').length;
      const completedCount = slaMetrics.filter((item) => item.sla_status === 'completed').length;
      const averageSLA =
        slaMetrics.length > 0
          ? slaMetrics.reduce((sum, item) => sum + item.sla_percent, 0) / slaMetrics.length
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
      setError('No fue posible cargar las metricas SLA.');
    } finally {
      setLoading(false);
    }
  }

  const topCritical = useMemo(
    () => metrics.filter((item) => item.sla_status === 'critical').slice(0, 6),
    [metrics]
  );

  if (loading) {
    return <div className="surface-card h-96 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="surface-card p-5 text-sm text-[#9f2f2d] border-[#f3c1c1] bg-[#fdebec]">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="surface-card p-5 text-sm text-[#956400] border-[#f0dea6] bg-[#fbf3db]">
        No hay datos SLA disponibles.
      </div>
    );
  }

  const slaState = getSLAState(stats.averageSLA);
  const criticalShare = toPercent(stats.criticalCount, stats.totalTickets);
  const warningShare = toPercent(stats.warningCount, stats.totalTickets);
  const stableShare = toPercent(stats.okCount + stats.completedCount, stats.totalTickets);
  const gapToTarget = stats.averageSLA - 95;

  return (
    <div className="stack-lg">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard
          title="Cumplimiento SLA"
          value={`${stats.averageSLA.toFixed(1)}%`}
          hint={`Estado ${slaState.label}`}
          icon={<Gauge size={18} />}
          trend={slaState.trend}
          accent={slaState.text}
          className="h-full"
        />

        <MetricCard
          title="Tickets Totales"
          value={stats.totalTickets.toLocaleString('es-ES')}
          hint="Base activa del monitoreo"
          icon={<Clock3 size={18} />}
          trend="neutral"
          accent="#1f6c9f"
          className="h-full"
        />

        <MetricCard
          title="En Critico"
          value={stats.criticalCount.toLocaleString('es-ES')}
          hint={`${criticalShare.toFixed(1)}% del total`}
          icon={<AlertTriangle size={18} />}
          trend={stats.criticalCount > 0 ? 'down' : 'up'}
          accent="#9f2f2d"
          className="h-full"
        />

        <MetricCard
          title="En Alerta"
          value={stats.warningCount.toLocaleString('es-ES')}
          hint={`${warningShare.toFixed(1)}% del total`}
          icon={<TimerReset size={18} />}
          trend={stats.warningCount > 0 ? 'neutral' : 'up'}
          accent="#956400"
          className="h-full"
        />

        <MetricCard
          title="Estables"
          value={(stats.okCount + stats.completedCount).toLocaleString('es-ES')}
          hint={`${stableShare.toFixed(1)}% del total`}
          icon={<ShieldCheck size={18} />}
          trend="up"
          accent="#346538"
          className="h-full"
        />

        <MetricCard
          title="Brecha vs Meta"
          value={`${gapToTarget >= 0 ? '+' : ''}${gapToTarget.toFixed(1)}%`}
          hint="Meta de referencia 95%"
          icon={<CheckCircle2 size={18} />}
          trend={gapToTarget >= 0 ? 'up' : 'down'}
          accent="#1f6c9f"
          className="h-full"
        />
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Semaforo operativo</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111111]">Estado global de servicio</h2>
          </div>
          <span
            className="status-chip"
            style={{
              color: slaState.text,
              backgroundColor: slaState.bg,
              border: `1px solid ${slaState.border}`,
            }}
          >
            {slaState.label}
          </span>
        </div>

        <div className="mt-4 h-3 rounded-full bg-[#eceae4] overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.max(0, Math.min(stats.averageSLA, 100))}%`,
              backgroundColor: slaState.text,
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-[#2f3437]">
          <div className="rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <p className="m-0"><strong>Meta:</strong> 95% cumplimiento.</p>
          </div>
          <div className="rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <p className="m-0"><strong>Gap actual:</strong> {gapToTarget.toFixed(1)} puntos.</p>
          </div>
          <div className="rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <p className="m-0"><strong>Refresco:</strong> datos cada 30 segundos.</p>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-[#EAEAEA] px-5 py-4 bg-[#FBFBFA]">
          <p className="eyebrow">Prioridad inmediata</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111111]">
            Tickets en estado Critico
          </h2>
        </div>

        {topCritical.length === 0 ? (
          <div className="p-5 text-sm text-[#346538]">No hay tickets en estado critico.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-[#EAEAEA] bg-white">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Descripcion</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Cliente</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Prioridad</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">SLA</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] bg-white">
                {topCritical.map((metric) => {
                  const priorityColor =
                    metric.priority === 'high'
                      ? { text: '#9f2f2d', bg: '#fdebec', border: '#f3c1c1' }
                      : metric.priority === 'medium'
                        ? { text: '#956400', bg: '#fbf3db', border: '#f0dea6' }
                        : { text: '#1f6c9f', bg: '#e1f3fe', border: '#b8dff5' };

                  return (
                    <tr key={metric.id} className="hover:bg-[#fbfbfa] transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-[#111111]">
                        {metric.description.length > 60
                          ? `${metric.description.slice(0, 60)}...`
                          : metric.description}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#2f3437]">{metric.client_name}</td>
                      <td className="px-5 py-4 text-sm">
                        <span
                          className="status-chip"
                          style={{
                            color: priorityColor.text,
                            backgroundColor: priorityColor.bg,
                            border: `1px solid ${priorityColor.border}`,
                          }}
                        >
                          {metric.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[#9f2f2d]">
                        {metric.sla_percent.toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <span className="status-chip" style={{ color: '#9f2f2d', backgroundColor: '#fdebec', border: '1px solid #f3c1c1' }}>
                          Critico
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

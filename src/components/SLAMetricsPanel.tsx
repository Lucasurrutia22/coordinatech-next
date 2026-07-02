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
  technician_id?: string;
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
  technician_id?: string;
}

interface SLAStats {
  totalTickets: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  completedCount: number;
  averageSLA: number;
}

interface DayPoint {
  day: string;
  avg: number;
  critical: number;
}

interface TechnicianPoint {
  id: string;
  name: string;
  avg: number;
  total: number;
  critical: number;
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

function getDayLabel(date: Date) {
  return date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
}

export function SLAMetricsPanel() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [technicianNames, setTechnicianNames] = useState<Record<string, string>>({});
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
      setLoading(true);
      setError(null);

      const [ticketsSettled, techniciansSettled] = await Promise.allSettled([
        supabase.from('tickets').select('*').order('created_at', { ascending: false }),
        supabase.from('technicians').select('id, name'),
      ]);

      if (ticketsSettled.status === 'rejected') {
        throw ticketsSettled.reason;
      }

      const ticketsResult = ticketsSettled.value;
      if (ticketsResult.error) throw ticketsResult.error;

      const names: Record<string, string> = {};
      if (techniciansSettled.status === 'fulfilled' && !techniciansSettled.value.error) {
        (techniciansSettled.value.data || []).forEach((tech: { id: string; name: string }) => {
          names[tech.id] = tech.name;
        });
      }
      setTechnicianNames(names);

      if (!ticketsResult.data) {
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

      const slaMetrics: SLAMetric[] = (ticketsResult.data as TicketData[])
        .filter((ticket) => Boolean(ticket.created_at))
        .map((ticket: TicketData) => {
        const parsedCreatedAt = new Date(ticket.created_at);
        const validCreatedAt = Number.isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt;
        const sla = calculateSLA(validCreatedAt, ticket.priority, ticket.status);
        return {
          id: ticket.id,
          description: ticket.description,
          client_name: ticket.client_name || 'Sin cliente',
          priority: ticket.priority,
          status: ticket.status,
          created_at: validCreatedAt.toISOString(),
          technician_id: ticket.technician_id,
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

  const priorityChart = useMemo(() => {
    const priorities: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];

    return priorities.map((priority) => {
      const group = metrics.filter((item) => item.priority === priority);
      const avg = group.length > 0 ? group.reduce((sum, item) => sum + item.sla_percent, 0) / group.length : 0;
      const critical = group.filter((item) => item.sla_status === 'critical').length;
      const label = priority === 'high' ? 'Alta' : priority === 'medium' ? 'Media' : 'Baja';
      return { priority, label, avg, total: group.length, critical };
    });
  }, [metrics]);

  const trend7d = useMemo<DayPoint[]>(() => {
    const buckets: DayPoint[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const next = new Date(day);
      next.setDate(day.getDate() + 1);

      const dayItems = metrics.filter((item) => {
        const created = new Date(item.created_at);
        if (Number.isNaN(created.getTime())) return false;
        return created >= day && created < next;
      });

      const avg =
        dayItems.length > 0
          ? dayItems.reduce((sum, item) => sum + item.sla_percent, 0) / dayItems.length
          : 0;
      const critical = dayItems.filter((item) => item.sla_status === 'critical').length;

      buckets.push({
        day: getDayLabel(day),
        avg,
        critical,
      });
    }

    return buckets;
  }, [metrics]);

  const technicianChart = useMemo<TechnicianPoint[]>(() => {
    const grouped = new Map<string, { sum: number; total: number; critical: number }>();

    metrics.forEach((item) => {
      const key = item.technician_id || 'sin_asignar';
      if (!grouped.has(key)) {
        grouped.set(key, { sum: 0, total: 0, critical: 0 });
      }
      const row = grouped.get(key);
      if (!row) return;

      row.sum += item.sla_percent;
      row.total += 1;
      if (item.sla_status === 'critical') row.critical += 1;
    });

    const points: TechnicianPoint[] = [];
    grouped.forEach((row, id) => {
      points.push({
        id,
        name: id === 'sin_asignar' ? 'Sin asignar' : technicianNames[id] || 'Tecnico',
        avg: row.total > 0 ? row.sum / row.total : 0,
        total: row.total,
        critical: row.critical,
      });
    });

    return points
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 6);
  }, [metrics, technicianNames]);

  const lineChartPoints = useMemo(() => {
    if (trend7d.length === 0) return '';
    return trend7d
      .map((point, index) => {
        const x = (index / Math.max(trend7d.length - 1, 1)) * 100;
        const y = 100 - Math.max(0, Math.min(point.avg, 100));
        return `${x},${y}`;
      })
      .join(' ');
  }, [trend7d]);

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

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="surface-card p-5">
          <p className="eyebrow">Grafico 1</p>
          <h3 className="mt-1 text-base font-semibold text-[#111111]">Cumplimiento por prioridad</h3>
          <div className="mt-4 space-y-3">
            {priorityChart.map((item) => {
              const color = item.priority === 'high' ? '#9f2f2d' : item.priority === 'medium' ? '#956400' : '#1f6c9f';
              return (
                <div key={item.priority} className="grid grid-cols-[90px_1fr_70px] gap-3 items-center">
                  <span className="text-sm text-[#2f3437] font-medium">{item.label}</span>
                  <div className="h-2.5 bg-[#eceae4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(item.avg, 100))}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#111111] text-right">{item.avg.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[#787774]">Referencia: objetivo minimo 95% por prioridad.</p>
        </div>

        <div className="surface-card p-5">
          <p className="eyebrow">Grafico 2</p>
          <h3 className="mt-1 text-base font-semibold text-[#111111]">Tendencia SLA ultimos 7 dias</h3>
          <div className="mt-4 rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <svg viewBox="0 0 100 100" className="w-full h-36" preserveAspectRatio="none" aria-label="Tendencia de SLA">
              <polyline
                fill="none"
                stroke="#d8d4cc"
                strokeWidth="1"
                points="0,50 100,50"
              />
              <polyline
                fill="none"
                stroke="#111111"
                strokeWidth="2"
                points={lineChartPoints}
              />
              {trend7d.map((point, index) => {
                const x = (index / Math.max(trend7d.length - 1, 1)) * 100;
                const y = 100 - Math.max(0, Math.min(point.avg, 100));
                return <circle key={point.day + index} cx={x} cy={y} r="1.7" fill="#111111" />;
              })}
            </svg>
            <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-[#787774]">
              {trend7d.map((point) => (
                <span key={point.day} className="text-center">{point.day}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="surface-card p-5">
        <p className="eyebrow">Grafico 3</p>
        <h3 className="mt-1 text-base font-semibold text-[#111111]">SLA por tecnico (foco de riesgo)</h3>
        <div className="mt-4 space-y-3">
          {technicianChart.length === 0 ? (
            <p className="text-sm text-[#787774] m-0">Sin datos suficientes por tecnico.</p>
          ) : (
            technicianChart.map((tech) => {
              const state = getSLAState(tech.avg);
              return (
                <div key={tech.id} className="grid grid-cols-[1fr_160px] gap-3 items-center">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="m-0 text-sm font-medium text-[#111111]">{tech.name}</p>
                      <p className="m-0 text-xs text-[#787774]">{tech.total} tickets</p>
                    </div>
                    <div className="h-2.5 bg-[#eceae4] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(0, Math.min(tech.avg, 100))}%`, backgroundColor: state.text }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="status-chip"
                      style={{
                        color: state.text,
                        backgroundColor: state.bg,
                        border: `1px solid ${state.border}`,
                      }}
                    >
                      {state.label}
                    </span>
                    <span className="text-sm font-semibold text-[#111111] min-w-[52px] text-right">{tech.avg.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })
          )}
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
                        <span
                          className="status-chip"
                          style={{ color: '#9f2f2d', backgroundColor: '#fdebec', border: '1px solid #f3c1c1' }}
                        >
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  Gauge,
  PauseCircle,
  Ticket,
  Trophy,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  formatDuration,
  getTechnicianAverageWorkTime,
  getTechnicianBreakStats,
} from '@/lib/timeTracking';
import { MetricCard } from '@/components/MetricCard';

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

interface EfficiencyState {
  label: 'Estable' | 'Alerta' | 'Critico';
  text: string;
  bg: string;
  border: string;
}

function getEfficiencyValue(tech: TechnicianStat) {
  if (tech.average_total_ms <= 0) return 0;
  return (tech.average_active_ms / tech.average_total_ms) * 100;
}

function getEfficiencyState(value: number): EfficiencyState {
  if (value >= 85) {
    return {
      label: 'Estable',
      text: '#346538',
      bg: '#edf3ec',
      border: '#c7dbc3',
    };
  }

  if (value >= 70) {
    return {
      label: 'Alerta',
      text: '#956400',
      bg: '#fbf3db',
      border: '#f0dea6',
    };
  }

  return {
    label: 'Critico',
    text: '#9f2f2d',
    bg: '#fdebec',
    border: '#f3c1c1',
  };
}

export function AdminAnalyticsDashboard({ days = 30 }: AdminAnalyticsProps) {
  const { technicians: appTechnicians } = useAppContext();
  const [technicians, setTechnicians] = useState<TechnicianStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAnalytics();
  }, [days]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const techs = (appTechnicians || []).map((tech) => ({ id: tech.id, name: tech.name }));

      const settled = await Promise.allSettled(
        techs.map(async (tech) => {
          const [workStats, breakStats] = await Promise.all([
            getTechnicianAverageWorkTime(tech.id, days),
            getTechnicianBreakStats(tech.id, days),
          ]);

          return {
            id: tech.id,
            name: tech.name,
            average_total_ms: workStats.average_total_ms,
            average_active_ms: workStats.average_active_ms,
            total_tickets: workStats.total_tickets,
            total_breaks: breakStats.total_breaks,
            total_break_time_ms: breakStats.total_break_time_ms,
            average_break_duration_ms: breakStats.average_break_duration_ms,
          } satisfies TechnicianStat;
        })
      );

      const stats = settled
        .filter((item): item is PromiseFulfilledResult<TechnicianStat> => item.status === 'fulfilled')
        .map((item) => item.value);

      setTechnicians(stats);

      if (techs.length > 0 && stats.length === 0) {
        setError('No fue posible construir metricas de tiempo para los tecnicos en este momento.');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('No fue posible cargar las metricas operativas en este momento.');
    } finally {
      setLoading(false);
    }
  }

  const analytics = useMemo(() => {
    const totalTickets = technicians.reduce((sum, t) => sum + t.total_tickets, 0);
    const totalBreaks = technicians.reduce((sum, t) => sum + t.total_breaks, 0);
    const totalBreakTime = technicians.reduce((sum, t) => sum + t.total_break_time_ms, 0);

    const weightedTotalMs = technicians.reduce((sum, t) => sum + t.average_total_ms * t.total_tickets, 0);
    const weightedActiveMs = technicians.reduce((sum, t) => sum + t.average_active_ms * t.total_tickets, 0);

    const averageCycleMs = totalTickets > 0 ? weightedTotalMs / totalTickets : 0;
    const averageActiveMs = totalTickets > 0 ? weightedActiveMs / totalTickets : 0;
    const averageDowntimeMs = Math.max(averageCycleMs - averageActiveMs, 0);

    const overallEfficiency = averageCycleMs > 0 ? (averageActiveMs / averageCycleMs) * 100 : 0;
    const breaksPerTicket = totalTickets > 0 ? totalBreaks / totalTickets : 0;

    const techniciansWithData = technicians.filter((t) => t.total_tickets > 0);
    const criticalCount = techniciansWithData.filter((t) => getEfficiencyValue(t) < 70).length;

    const topPerformer = [...techniciansWithData].sort(
      (a, b) => getEfficiencyValue(b) - getEfficiencyValue(a)
    )[0];

    return {
      totalTickets,
      totalBreaks,
      totalBreakTime,
      averageCycleMs,
      averageDowntimeMs,
      overallEfficiency,
      breaksPerTicket,
      criticalCount,
      topPerformer,
    };
  }, [technicians]);

  if (loading) {
    return <div className="surface-card h-64 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="surface-card p-5 text-sm text-[#9f2f2d] border-[#f3c1c1] bg-[#fdebec]">
        {error}
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="surface-card p-5 text-sm text-[#956400] border-[#f0dea6] bg-[#fbf3db]">
        No hay datos suficientes de tecnicos para construir los graficos KPI de analitica.
      </div>
    );
  }

  const avgCycle = formatDuration(analytics.averageCycleMs);
  const avgDowntime = formatDuration(analytics.averageDowntimeMs);
  const breakTimeDur = formatDuration(analytics.totalBreakTime);

  return (
    <div className="stack-lg">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard
          title="Tickets Procesados"
          value={analytics.totalTickets.toLocaleString('es-ES')}
          hint={`Cobertura de ${days} dias`}
          icon={<Ticket size={18} />}
          trend="neutral"
          accent="#1f6c9f"
          className="h-full"
        />

        <MetricCard
          title="Eficiencia Operativa"
          value={`${analytics.overallEfficiency.toFixed(1)}%`}
          hint={
            analytics.overallEfficiency >= 85
              ? 'Estado Estable'
              : analytics.overallEfficiency >= 70
                ? 'Estado Alerta'
                : 'Estado Critico'
          }
          icon={<Gauge size={18} />}
          trend={
            analytics.overallEfficiency >= 85
              ? 'up'
              : analytics.overallEfficiency >= 70
                ? 'neutral'
                : 'down'
          }
          accent="#346538"
          className="h-full"
        />

        <MetricCard
          title="Tiempo Medio de Ciclo"
          value={avgCycle.formatted}
          hint="Promedio por ticket"
          icon={<Clock3 size={18} />}
          trend="neutral"
          accent="#956400"
          className="h-full"
        />

        <MetricCard
          title="Pausas Totales"
          value={analytics.totalBreaks.toLocaleString('es-ES')}
          hint={`${analytics.breaksPerTicket.toFixed(2)} pausas por ticket`}
          icon={<PauseCircle size={18} />}
          trend={analytics.breaksPerTicket <= 1 ? 'up' : 'down'}
          accent="#9f2f2d"
          className="h-full"
        />

        <MetricCard
          title="Tiempo Total en Pausas"
          value={breakTimeDur.formatted}
          hint={`Tiempo muerto medio ${avgDowntime.formatted}`}
          icon={<AlertTriangle size={18} />}
          trend={analytics.averageDowntimeMs <= analytics.averageCycleMs * 0.2 ? 'up' : 'down'}
          accent="#956400"
          className="h-full"
        />

        <MetricCard
          title="Top Performer"
          value={analytics.topPerformer ? analytics.topPerformer.name : 'Sin datos'}
          hint={
            analytics.topPerformer
              ? `${getEfficiencyValue(analytics.topPerformer).toFixed(1)}% eficiencia`
              : 'Aun no hay tickets cerrados'
          }
          icon={<Trophy size={18} />}
          trend="up"
          accent="#1f6c9f"
          className="h-full"
        />
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Riesgo operativo</p>
            <h2 className="mt-1 text-lg font-semibold text-[#111111]">Alertas de productividad</h2>
          </div>
          <span
            className="status-chip"
            style={{
              color: analytics.criticalCount > 0 ? '#9f2f2d' : '#346538',
              backgroundColor: analytics.criticalCount > 0 ? '#fdebec' : '#edf3ec',
              border: `1px solid ${analytics.criticalCount > 0 ? '#f3c1c1' : '#c7dbc3'}`,
            }}
          >
            {analytics.criticalCount > 0
              ? `${analytics.criticalCount} tecnicos en Critico`
              : 'Sin tecnicos en Critico'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <p className="m-0 text-[#2f3437]">
              <strong>Objetivo recomendado:</strong> mantener eficiencia por tecnico por encima de 85%.
            </p>
          </div>
          <div className="rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
            <p className="m-0 text-[#2f3437]">
              <strong>Senal de accion:</strong> revisar causas cuando pausas por ticket superan 1.00.
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-[#EAEAEA] px-5 py-4 bg-[#FBFBFA]">
          <p className="eyebrow">Detalle por tecnico</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111111]">Tabla de desempeño</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-[#EAEAEA] bg-white">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Tecnico</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Tickets</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Ciclo medio</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Activo medio</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Eficiencia</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Pausas</th>
                <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Pausa media</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] bg-white">
              {technicians.map((tech) => {
                const avgTotal = formatDuration(tech.average_total_ms);
                const avgActive = formatDuration(tech.average_active_ms);
                const avgBreak = formatDuration(tech.average_break_duration_ms);
                const efficiency = getEfficiencyValue(tech);
                const state = getEfficiencyState(efficiency);

                return (
                  <tr
                    key={tech.id}
                    className="cursor-pointer hover:bg-[#fbfbfa] transition-colors"
                    onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                  >
                    <td className="px-5 py-4 text-sm font-medium text-[#111111]">{tech.name}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437]">{tech.total_tickets}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437] font-mono">{avgTotal.formatted}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437] font-mono">{avgActive.formatted}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
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
                        <span className="text-sm font-semibold text-[#111111]">{efficiency.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#2f3437]">{tech.total_breaks}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437] font-mono">{avgBreak.formatted}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedTech && (
        <section className="surface-card p-5">
          {(() => {
            const tech = technicians.find((item) => item.id === selectedTech);
            if (!tech) return null;

            const avgTotal = formatDuration(tech.average_total_ms);
            const avgActive = formatDuration(tech.average_active_ms);
            const avgBreak = formatDuration(tech.average_break_duration_ms);
            const totalBreakMs =
              tech.total_breaks > 0 ? tech.average_break_duration_ms * tech.total_breaks : 0;
            const totalBreakDur = formatDuration(totalBreakMs);
            const downtime = formatDuration(Math.max(tech.average_total_ms - tech.average_active_ms, 0));
            const efficiency = getEfficiencyValue(tech);
            const state = getEfficiencyState(efficiency);

            return (
              <div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="eyebrow">Drilldown</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">{tech.name}</h3>
                  </div>
                  <span
                    className="status-chip"
                    style={{
                      color: state.text,
                      backgroundColor: state.bg,
                      border: `1px solid ${state.border}`,
                    }}
                  >
                    {state.label} {efficiency.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Tickets completados</p>
                    <p className="mt-1 text-2xl font-semibold text-[#111111]">{tech.total_tickets}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Tiempo total medio</p>
                    <p className="mt-1 text-base font-semibold text-[#111111] font-mono">{avgTotal.formatted}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Tiempo activo medio</p>
                    <p className="mt-1 text-base font-semibold text-[#346538] font-mono">{avgActive.formatted}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Tiempo muerto medio</p>
                    <p className="mt-1 text-base font-semibold text-[#9f2f2d] font-mono">{downtime.formatted}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Total pausas</p>
                    <p className="mt-1 text-2xl font-semibold text-[#111111]">{tech.total_breaks}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Pausa media</p>
                    <p className="mt-1 text-base font-semibold text-[#111111] font-mono">{avgBreak.formatted}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Tiempo total en pausas</p>
                    <p className="mt-1 text-base font-semibold text-[#111111] font-mono">{totalBreakDur.formatted}</p>
                  </div>
                  <div className="rounded-lg border border-[#EAEAEA] bg-[#FBFBFA] p-3">
                    <p className="text-xs text-[#787774] m-0">Pausas por ticket</p>
                    <p className="mt-1 text-base font-semibold text-[#111111]">
                      {tech.total_tickets > 0 ? (tech.total_breaks / tech.total_tickets).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}

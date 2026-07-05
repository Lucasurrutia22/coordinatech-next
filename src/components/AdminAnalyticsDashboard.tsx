'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  PauseCircle,
  Ticket as TicketIcon,
  Trophy,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import {
  formatDuration,
  getTechnicianAverageWorkTime,
  getTechnicianBreakStats,
} from '@/lib/timeTracking';
import { calculateSLACompliance, calculateSLAMetrics } from '@/lib/sla';
import { MetricCard } from '@/components/MetricCard';

interface TimeStat {
  id: string;
  name: string;
  average_total_ms: number;
  average_active_ms: number;
  total_tickets: number;
  total_breaks: number;
  total_break_time_ms: number;
  average_break_duration_ms: number;
}

interface TechnicianVolume {
  id: string;
  name: string;
  total: number;
  completed: number;
  breached: number;
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

function getEfficiencyValue(tech: TimeStat) {
  if (tech.average_total_ms <= 0) return 0;
  return (tech.average_active_ms / tech.average_total_ms) * 100;
}

function getEfficiencyState(value: number): EfficiencyState {
  if (value >= 85) {
    return { label: 'Estable', text: '#346538', bg: '#edf3ec', border: '#c7dbc3' };
  }
  if (value >= 70) {
    return { label: 'Alerta', text: '#956400', bg: '#fbf3db', border: '#f0dea6' };
  }
  return { label: 'Critico', text: '#9f2f2d', bg: '#fdebec', border: '#f3c1c1' };
}

export function AdminAnalyticsDashboard({ days = 30 }: AdminAnalyticsProps) {
  const { technicians: appTechnicians, tickets, isReady } = useAppContext();

  // ── KPIs de volumen/cumplimiento: se calculan directo de los tickets que ya
  // ve el resto de la app (mismo AppContext), así que siempre reflejan datos
  // reales — no dependen de que el cronómetro se haya usado. ──
  const volume = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const periodTickets = tickets.filter((t) => {
      if (t.is_archived || !t.created_at) return false;
      const created = new Date(t.created_at);
      return !Number.isNaN(created.getTime()) && created >= cutoff;
    });

    const completed = periodTickets.filter((t) => t.status === 'completed');
    const notCompleted = periodTickets.filter((t) => t.status === 'not_completed');
    const open = periodTickets.filter((t) => !['completed', 'not_completed'].includes(t.status));
    const compliance = calculateSLACompliance(periodTickets);

    const perTechnician = new Map<string, TechnicianVolume>();
    periodTickets.forEach((t) => {
      const key = t.technician_id || 'sin_asignar';
      if (!perTechnician.has(key)) {
        perTechnician.set(key, {
          id: key,
          name: key === 'sin_asignar' ? 'Sin asignar' : appTechnicians.find((tech) => tech.id === key)?.name || 'Tecnico',
          total: 0,
          completed: 0,
          breached: 0,
        });
      }
      const row = perTechnician.get(key);
      if (!row) return;
      row.total += 1;
      if (t.status === 'completed') row.completed += 1;
      if (calculateSLAMetrics(t).level === 'overdue') row.breached += 1;
    });

    return {
      totalTickets: periodTickets.length,
      completedCount: completed.length,
      notCompletedCount: notCompleted.length,
      openCount: open.length,
      completionRate: periodTickets.length > 0 ? (completed.length / periodTickets.length) * 100 : 0,
      slaCompliancePercent: compliance.percentage,
      slaBreaches: compliance.critical,
      technicianVolume: Array.from(perTechnician.values()).sort((a, b) => b.total - a.total),
    };
  }, [tickets, days, appTechnicians]);

  // ── KPIs de tiempo/eficiencia: requieren que los tickets se hayan cerrado
  // usando el cronómetro (work_started_at/work_ended_at). Se degradan con un
  // aviso en vez de vaciar toda la página cuando aún no hay ese dato. ──
  const [timeStats, setTimeStats] = useState<TimeStat[]>([]);
  const [loadingTime, setLoadingTime] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTimeStats() {
      setLoadingTime(true);
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
          } satisfies TimeStat;
        })
      );

      const stats = settled
        .filter((item): item is PromiseFulfilledResult<TimeStat> => item.status === 'fulfilled')
        .map((item) => item.value);

      if (active) {
        setTimeStats(stats);
        setLoadingTime(false);
      }
    }

    void loadTimeStats();
    return () => { active = false; };
  }, [appTechnicians, days]);

  const timeAnalytics = useMemo(() => {
    const withData = timeStats.filter((t) => t.total_tickets > 0);
    const totalTickets = withData.reduce((sum, t) => sum + t.total_tickets, 0);
    const totalBreaks = withData.reduce((sum, t) => sum + t.total_breaks, 0);
    const totalBreakTime = withData.reduce((sum, t) => sum + t.total_break_time_ms, 0);

    const weightedTotalMs = withData.reduce((sum, t) => sum + t.average_total_ms * t.total_tickets, 0);
    const weightedActiveMs = withData.reduce((sum, t) => sum + t.average_active_ms * t.total_tickets, 0);

    const averageCycleMs = totalTickets > 0 ? weightedTotalMs / totalTickets : 0;
    const averageActiveMs = totalTickets > 0 ? weightedActiveMs / totalTickets : 0;
    const averageDowntimeMs = Math.max(averageCycleMs - averageActiveMs, 0);
    const overallEfficiency = averageCycleMs > 0 ? (averageActiveMs / averageCycleMs) * 100 : 0;
    const breaksPerTicket = totalTickets > 0 ? totalBreaks / totalTickets : 0;
    const criticalCount = withData.filter((t) => getEfficiencyValue(t) < 70).length;
    const topPerformer = [...withData].sort((a, b) => getEfficiencyValue(b) - getEfficiencyValue(a))[0];

    return {
      hasData: withData.length > 0,
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
  }, [timeStats]);

  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  if (!isReady) {
    return <div className="surface-card h-64 animate-pulse" />;
  }

  const avgCycle = formatDuration(timeAnalytics.averageCycleMs);
  const avgDowntime = formatDuration(timeAnalytics.averageDowntimeMs);
  const breakTimeDur = formatDuration(timeAnalytics.totalBreakTime);

  return (
    <div className="stack-lg">
      {/* ── Volumen y cumplimiento: siempre real, no depende del cronómetro ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Tickets del Periodo"
          value={volume.totalTickets.toLocaleString('es-ES')}
          hint={`Ultimos ${days} dias`}
          icon={<TicketIcon size={18} />}
          trend="neutral"
          accent="#1f6c9f"
          className="h-full"
        />
        <MetricCard
          title="Tasa de Completacion"
          value={`${volume.completionRate.toFixed(1)}%`}
          hint={`${volume.completedCount} completados / ${volume.openCount} abiertos`}
          icon={<CheckCircle2 size={18} />}
          trend={volume.completionRate >= 70 ? 'up' : 'down'}
          accent="#346538"
          className="h-full"
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${volume.slaCompliancePercent}%`}
          hint="Sobre tickets cerrados del periodo"
          icon={<Gauge size={18} />}
          trend={volume.slaCompliancePercent >= 95 ? 'up' : volume.slaCompliancePercent >= 80 ? 'neutral' : 'down'}
          accent="#1f6c9f"
          className="h-full"
        />
        <MetricCard
          title="SLA Vencidos"
          value={volume.slaBreaches.toLocaleString('es-ES')}
          hint="Tickets que superaron su ventana"
          icon={<AlertTriangle size={18} />}
          trend={volume.slaBreaches > 0 ? 'down' : 'up'}
          accent="#9f2f2d"
          className="h-full"
        />
      </section>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-[#EAEAEA] px-5 py-4 bg-[#FBFBFA]">
          <p className="eyebrow">Volumen por tecnico</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111111]">Carga de trabajo y cumplimiento</h2>
        </div>

        {volume.technicianVolume.length === 0 ? (
          <div className="p-5 text-sm text-[#956400]">No hay tickets en el periodo seleccionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-[#EAEAEA] bg-white">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Tecnico</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Tickets</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">Completados</th>
                  <th className="px-5 py-3 text-left text-[11px] uppercase tracking-[0.08em] text-[#787774]">SLA vencidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] bg-white">
                {volume.technicianVolume.map((tech) => (
                  <tr key={tech.id} className="hover:bg-[#fbfbfa] transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-[#111111]">{tech.name}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437]">{tech.total}</td>
                    <td className="px-5 py-4 text-sm text-[#2f3437]">{tech.completed}</td>
                    <td className="px-5 py-4 text-sm">
                      <span
                        className="status-chip"
                        style={
                          tech.breached > 0
                            ? { color: '#9f2f2d', backgroundColor: '#fdebec', border: '1px solid #f3c1c1' }
                            : { color: '#346538', backgroundColor: '#edf3ec', border: '1px solid #c7dbc3' }
                        }
                      >
                        {tech.breached}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Tiempos de ciclo/eficiencia: requiere tickets cerrados con el cronómetro ── */}
      {loadingTime ? (
        <div className="surface-card h-48 animate-pulse" />
      ) : !timeAnalytics.hasData ? (
        <div className="surface-card p-5 text-sm text-[#956400] border-[#f0dea6] bg-[#fbf3db]">
          Aun no hay tickets cerrados con el cronometro de trabajo en este periodo, por lo que
          los KPIs de tiempo de ciclo y eficiencia no tienen datos todavia. Apareceran a medida
          que los tecnicos completen tickets usando &quot;Iniciar&quot; en el cronometro.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <MetricCard
              title="Eficiencia Operativa"
              value={`${timeAnalytics.overallEfficiency.toFixed(1)}%`}
              hint={
                timeAnalytics.overallEfficiency >= 85
                  ? 'Estado Estable'
                  : timeAnalytics.overallEfficiency >= 70
                    ? 'Estado Alerta'
                    : 'Estado Critico'
              }
              icon={<Gauge size={18} />}
              trend={
                timeAnalytics.overallEfficiency >= 85
                  ? 'up'
                  : timeAnalytics.overallEfficiency >= 70
                    ? 'neutral'
                    : 'down'
              }
              accent="#346538"
              className="h-full"
            />
            <MetricCard
              title="Tiempo Medio de Ciclo"
              value={avgCycle.formatted}
              hint="Promedio por ticket cerrado"
              icon={<Clock3 size={18} />}
              trend="neutral"
              accent="#956400"
              className="h-full"
            />
            <MetricCard
              title="Pausas Totales"
              value={timeAnalytics.totalBreaks.toLocaleString('es-ES')}
              hint={`${timeAnalytics.breaksPerTicket.toFixed(2)} pausas por ticket`}
              icon={<PauseCircle size={18} />}
              trend={timeAnalytics.breaksPerTicket <= 1 ? 'up' : 'down'}
              accent="#9f2f2d"
              className="h-full"
            />
            <MetricCard
              title="Tiempo Total en Pausas"
              value={breakTimeDur.formatted}
              hint={`Tiempo muerto medio ${avgDowntime.formatted}`}
              icon={<AlertTriangle size={18} />}
              trend={timeAnalytics.averageDowntimeMs <= timeAnalytics.averageCycleMs * 0.2 ? 'up' : 'down'}
              accent="#956400"
              className="h-full"
            />
            <MetricCard
              title="Top Performer"
              value={timeAnalytics.topPerformer ? timeAnalytics.topPerformer.name : 'Sin datos'}
              hint={
                timeAnalytics.topPerformer
                  ? `${getEfficiencyValue(timeAnalytics.topPerformer).toFixed(1)}% eficiencia`
                  : 'Aun no hay tickets cerrados'
              }
              icon={<Trophy size={18} />}
              trend="up"
              accent="#1f6c9f"
              className="h-full"
            />
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-[#EAEAEA] px-5 py-4 bg-[#FBFBFA]">
              <p className="eyebrow">Detalle por tecnico</p>
              <h2 className="mt-1 text-lg font-semibold text-[#111111]">Tiempos y eficiencia</h2>
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
                  {timeStats.filter((t) => t.total_tickets > 0).map((tech) => {
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
                              style={{ color: state.text, backgroundColor: state.bg, border: `1px solid ${state.border}` }}
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

          {selectedTech && (() => {
            const tech = timeStats.find((item) => item.id === selectedTech);
            if (!tech) return null;

            const avgTotal = formatDuration(tech.average_total_ms);
            const avgActive = formatDuration(tech.average_active_ms);
            const avgBreak = formatDuration(tech.average_break_duration_ms);
            const totalBreakMs = tech.total_breaks > 0 ? tech.average_break_duration_ms * tech.total_breaks : 0;
            const totalBreakDur = formatDuration(totalBreakMs);
            const downtime = formatDuration(Math.max(tech.average_total_ms - tech.average_active_ms, 0));
            const efficiency = getEfficiencyValue(tech);
            const state = getEfficiencyState(efficiency);

            return (
              <section className="surface-card p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="eyebrow">Drilldown</p>
                    <h3 className="mt-1 text-lg font-semibold text-[#111111]">{tech.name}</h3>
                  </div>
                  <span
                    className="status-chip"
                    style={{ color: state.text, backgroundColor: state.bg, border: `1px solid ${state.border}` }}
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
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}

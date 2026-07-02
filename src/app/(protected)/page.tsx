"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2, Clock3, ListTodo, TriangleAlert, Users, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { SLABadge, SLATimeRemaining } from "@/components/SLABadge";
import { useAppContext } from "@/context/AppContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const { user, getVisibleTickets, technicians, getSLACompliance, getTicketsBySLAStatus } = useAppContext();

  const visibleTickets = getVisibleTickets();
  const slaCompliance = getSLACompliance();
  const slaBySatus = getTicketsBySLAStatus();

  const pending    = visibleTickets.filter((t) => t.status === "pending").length;
  const inProgress = visibleTickets.filter((t) => t.status === "in_progress").length;
  const completed  = visibleTickets.filter((t) => t.status === "completed").length;
  const activeTechs = technicians.filter((t) => t.active).length;
  const activeTickets = visibleTickets.filter((t) => !["completed", "not_completed"].includes(t.status));

  const priorityMix = useMemo(() => {
    const total = Math.max(visibleTickets.length, 1);
    const high = visibleTickets.filter((t) => t.priority === "high").length;
    const medium = visibleTickets.filter((t) => t.priority === "medium").length;
    const low = visibleTickets.filter((t) => t.priority === "low").length;

    return [
      { key: "high", label: "Alta", value: (high / total) * 100, color: "#9f2f2d", count: high },
      { key: "medium", label: "Media", value: (medium / total) * 100, color: "#956400", count: medium },
      { key: "low", label: "Baja", value: (low / total) * 100, color: "#1f6c9f", count: low },
    ];
  }, [visibleTickets]);

  const slaTrend = useMemo(() => {
    const toScore = (status?: string) => {
      if (status === "critical") return 20;
      if (status === "warning") return 60;
      if (status === "healthy") return 92;
      return 84;
    };

    const today = new Date();
    const points = [] as Array<{ day: string; avg: number }>;

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const next = new Date(day);
      next.setDate(day.getDate() + 1);

      const dayTickets = visibleTickets.filter((ticket) => {
        const raw = ticket.created_at || ticket.scheduled_date;
        const date = new Date(raw);
        return date >= day && date < next;
      });

      const avg =
        dayTickets.length > 0
          ? dayTickets.reduce((sum, ticket) => sum + toScore(ticket.sla_status), 0) / dayTickets.length
          : 0;

      points.push({
        day: day.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
        avg,
      });
    }

    return points;
  }, [visibleTickets]);

  const technicianSLA = useMemo(() => {
    const rows = technicians
      .filter((tech) => tech.active)
      .map((tech) => {
        const assigned = visibleTickets.filter((ticket) => ticket.technician_id === tech.id);
        const total = assigned.length;
        const critical = assigned.filter((ticket) => ticket.sla_status === "critical").length;
        const compliance = total > 0 ? ((total - critical) / total) * 100 : 100;

        return {
          id: tech.id,
          name: tech.name,
          total,
          critical,
          compliance,
        };
      })
      .sort((a, b) => a.compliance - b.compliance)
      .slice(0, 6);

    return rows;
  }, [technicians, visibleTickets]);

  const trendPolyline = useMemo(() => {
    if (slaTrend.length === 0) return "";

    return slaTrend
      .map((point, index) => {
        const x = (index / Math.max(slaTrend.length - 1, 1)) * 100;
        const y = 100 - Math.max(0, Math.min(point.avg, 100));
        return `${x},${y}`;
      })
      .join(" ");
  }, [slaTrend]);

  return (
    <section className="stack-lg">
      <div className="surface-card p-6 md:p-8 fade-in-up">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div className="grid gap-4">
            <div>
              <p className="eyebrow">Centro operativo</p>
              <h1 className="editorial-title text-4xl md:text-5xl text-[#111111] mt-2">
                Una vista clara del trabajo abierto, el SLA y el equipo en campo.
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-[#787774] leading-6">
                Coordina tickets, detecta fricción y mantén el ritmo diario sin perder contexto. La información clave está arriba, el detalle queda al alcance.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="status-chip status-completed">{visibleTickets.length} tickets visibles</span>
              <span className="status-chip status-assigned">{activeTickets.length} activos</span>
              <span className="status-chip status-pending">{slaBySatus.critical.length} críticos</span>
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-4">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.08em] text-[#787774]">Resumen del día</p>
                <p className="text-sm font-semibold text-[#111111]">{new Date().toLocaleDateString("es-CL", { dateStyle: "long" })}</p>
              </div>
              <CheckCircle2 size={18} className="text-[#346538]" />
            </div>
            <div className="grid gap-3 text-sm text-[#2f3437]">
              <div className="flex items-center justify-between">
                <span>Pendientes</span>
                <strong>{pending}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>En progreso</span>
                <strong>{inProgress}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Técnicos activos</span>
                <strong>{activeTechs}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-metrics">
        <MetricCard label="Tickets totales" value={String(visibleTickets.length)} hint="Carga operacional actual" icon={<ListTodo size={16} />} accent="#111111" />
        <MetricCard label="Pendientes" value={String(pending)} hint="Requieren asignación" icon={<TriangleAlert size={16} />} accent="#956400" />
        <MetricCard label="En progreso" value={String(inProgress)} hint="Trabajo activo en terreno" icon={<Clock3 size={16} />} accent="#1f6c9f" />
        <MetricCard label="SLA crítico" value={String(slaBySatus.critical.length)} hint="Vencidos o por vencer" icon={<AlertTriangle size={16} />} accent="#9f2f2d" />
      </div>

      {/* SLA Compliance Bar */}
      {user?.role === "admin" && (
        <div className="surface-card p-5 fade-in-up" style={{ ["--delay" as never]: "90ms" }}>
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="eyebrow">Monitoreo SLA</p>
              <h3 className="text-sm font-semibold text-[#111111] mt-1">Cumplimiento general</h3>
            </div>
            <span className="text-xs uppercase tracking-[0.08em] text-[#787774]">
              {slaCompliance.compliant} / {slaCompliance.total}
            </span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "#ece8e0", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${slaCompliance.percentage}%`,
                height: "100%",
                background: slaCompliance.percentage >= 95 ? "#346538" : slaCompliance.percentage >= 85 ? "#956400" : "#9f2f2d",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
            {slaCompliance.percentage}% de cumplimiento
          </p>
        </div>
      )}

      {user?.role === "admin" && (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 fade-in-up" style={{ ["--delay" as never]: "130ms" }}>
          <article className="surface-card p-5">
            <p className="eyebrow">Gráfico KPI</p>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">Distribución por prioridad</h3>
            <div className="mt-4 grid gap-3">
              {priorityMix.map((item) => (
                <div key={item.key} className="grid grid-cols-[80px_1fr_70px] gap-3 items-center">
                  <span className="text-sm text-[#2f3437]">{item.label}</span>
                  <div className="h-2.5 bg-[#eceae4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(item.value, 100))}%`, background: item.color }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[#111111] text-right">{item.count}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-card p-5">
            <p className="eyebrow">Gráfico KPI</p>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">Tendencia SLA (7 días)</h3>
            <div className="mt-4 rounded-lg border border-[#EAEAEA] bg-[#fdfdfc] p-3">
              <svg viewBox="0 0 100 100" className="w-full h-32" preserveAspectRatio="none" aria-label="Tendencia SLA semanal">
                <polyline fill="none" stroke="#d8d4cc" strokeWidth="1" points="0,50 100,50" />
                <polyline fill="none" stroke="#111111" strokeWidth="2" points={trendPolyline} />
                {slaTrend.map((point, index) => {
                  const x = (index / Math.max(slaTrend.length - 1, 1)) * 100;
                  const y = 100 - Math.max(0, Math.min(point.avg, 100));
                  return <circle key={`${point.day}-${index}`} cx={x} cy={y} r="1.7" fill="#111111" />;
                })}
              </svg>
              <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-[#787774]">
                {slaTrend.map((point, idx) => (
                  <span key={`${point.day}-${idx}`} className="text-center">{point.day}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="surface-card p-5">
            <p className="eyebrow">Gráfico KPI</p>
            <h3 className="text-sm font-semibold text-[#111111] mt-1">SLA por técnico</h3>
            <div className="mt-4 grid gap-3">
              {technicianSLA.length === 0 && <p className="text-sm text-[#787774] m-0">Sin datos de técnicos activos.</p>}
              {technicianSLA.map((tech) => {
                const color = tech.compliance >= 85 ? "#346538" : tech.compliance >= 70 ? "#956400" : "#9f2f2d";
                return (
                  <div key={tech.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="m-0 text-sm font-medium text-[#111111] truncate max-w-[70%]">{tech.name}</p>
                      <p className="m-0 text-xs text-[#787774]">{tech.compliance.toFixed(1)}%</p>
                    </div>
                    <div className="h-2.5 bg-[#eceae4] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${tech.compliance}%`, background: color }} />
                    </div>
                    <p className="m-0 mt-1 text-[11px] text-[#787774]">{tech.total} tickets · {tech.critical} críticos</p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      )}

      <div className="dashboard-grid">
        {/* Recent tickets */}
        <article className="surface-card p-5">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Actividad reciente</p>
              <h2>Tickets {user?.role === "admin" ? "recientes" : "asignados"}</h2>
            </div>
            <Link href="/tickets" className="outline-btn" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>Ver todos</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>SLA</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.slice(0, 6).map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/tickets/${ticket.id}`}>
                        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{ticket.title}</span>
                      </Link>
                      <p className="muted" style={{ fontSize: "0.76rem", marginTop: "0.15rem" }}>{ticket.address}</p>
                    </td>
                    <td><StatusPill status={ticket.status} /></td>
                    <td><PriorityPill priority={ticket.priority} /></td>
                    <td>
                      <SLABadge ticket={ticket} />
                      {ticket.sla_deadline && (
                        <div style={{ fontSize: "0.7rem", marginTop: "0.3rem" }}>
                          <SLATimeRemaining deadline={ticket.sla_deadline} />
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {format(new Date(ticket.scheduled_date), "dd MMM", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleTickets.length === 0 && <p className="muted" style={{ padding: "1rem" }}>No hay tickets aun.</p>}
          </div>
        </article>

        {/* Team panel */}
        <article className="surface-card p-5">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Equipo activo</p>
              <h2>Capacidad disponible</h2>
            </div>
            <span className="role-pill"><Users size={11} /> {activeTechs} activos</span>
          </div>
          <div className="stack-sm">
            {technicians.filter((t) => t.active).slice(0, 6).map((tech) => (
              <div key={tech.id} className="ticket-row" style={{ padding: "0.6rem 0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: "0.68rem" }}>
                    {tech.name.split(" ").slice(0,2).map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="headline" style={{ fontSize: "0.85rem" }}>{tech.name}</p>
                    <p className="muted" style={{ fontSize: "0.74rem" }}>{tech.phone}</p>
                  </div>
                </div>
                <span className="status-chip status-completed" style={{ fontSize: "0.7rem" }}>Activo</span>
              </div>
            ))}
            {technicians.length === 0 && <p className="muted">Sin tecnicos registrados.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

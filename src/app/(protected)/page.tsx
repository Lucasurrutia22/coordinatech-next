"use client";

import Link from "next/link";
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

  return (
    <section className="stack-lg">
      {/* Metrics */}
      <div className="grid-metrics">
        <MetricCard label="Tickets totales"  value={String(visibleTickets.length)} hint="Carga operacional actual"     icon={<ListTodo size={16} />}  accent="#0ea472" />
        <MetricCard label="Pendientes"       value={String(pending)}        hint="Requieren asignacion"         icon={<TriangleAlert size={16} />} accent="#d97706" />
        <MetricCard label="En progreso"      value={String(inProgress)}     hint="Trabajo activo en terreno"    icon={<Clock3 size={16} />}   accent="#2563eb" />
        <MetricCard label="SLA Critical"     value={String(slaBySatus.critical.length)}      hint="Vencidos o a punto de vencer"            icon={<AlertTriangle size={16} />} accent="#dc2626" />
      </div>

      {/* SLA Compliance Bar */}
      {user?.role === "admin" && (
        <div className="panel" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Cumplimiento de SLA</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {slaCompliance.compliant} / {slaCompliance.total}
            </span>
          </div>
          <div style={{ 
            width: "100%", 
            height: "8px", 
            background: "#e5e7eb", 
            borderRadius: "4px", 
            overflow: "hidden" 
          }}>
            <div
              style={{
                width: `${slaCompliance.percentage}%`,
                height: "100%",
                background: slaCompliance.percentage >= 95 ? "#16a34a" : slaCompliance.percentage >= 85 ? "#d97706" : "#dc2626",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.5rem" }}>
            {slaCompliance.percentage}% de cumplimiento
          </p>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Recent tickets */}
        <article className="panel">
          <div className="panel-header">
            <h2>Tickets {user?.role === "admin" ? "recientes" : "asignados"}</h2>
            <Link href="/tickets" className="outline-btn" style={{ fontSize: "0.8rem", padding: "0.3rem 0.7rem" }}>Ver todos</Link>
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
                        <span style={{ color: "var(--ink)", fontWeight: 500 }}>{ticket.title}</span>
                      </Link>
                      <p className="muted" style={{ fontSize: "0.76rem", marginTop: "0.1rem" }}>{ticket.address}</p>
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
        <article className="panel">
          <div className="panel-header">
            <h2>Equipo</h2>
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
                <span className="pill status-completed" style={{ fontSize: "0.7rem" }}>Activo</span>
              </div>
            ))}
            {technicians.length === 0 && <p className="muted">Sin tecnicos registrados.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { useAppContext } from "@/context/AppContext";
import { TICKET_TYPE_META, TicketStatus } from "@/types/domain";

function getSLA(scheduledDate: string, status: TicketStatus) {
  if (status === "completed") return null;
  const diffMs  = new Date(scheduledDate).getTime() - Date.now();
  const overdue = diffMs < 0;
  const totalH  = Math.abs(Math.floor(diffMs / 3_600_000));
  const mins    = Math.abs(Math.floor((diffMs % 3_600_000) / 60_000));
  const days    = Math.floor(totalH / 24);

  let label: string;
  if (overdue)         label = totalH >= 24 ? `${days}d vencido` : `${totalH}h vencido`;
  else if (totalH < 2) label = `${totalH}h ${mins}m`;
  else if (totalH < 24) label = `${totalH}h`;
  else                  label = `${days}d ${totalH % 24}h`;

  const color  = overdue ? "#dc2626" : totalH < 24 ? "#d97706" : "#16a34a";
  const bg     = overdue ? "#fef2f2" : totalH < 24 ? "#fffbeb" : "#f0fdf4";
  const border = overdue ? "#fca5a5" : totalH < 24 ? "#fcd34d" : "#86efac";
  return { label, color, bg, border };
}

export default function TicketsPage() {
  const { tickets, technicians, user } = useAppContext();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 style={{ marginBottom: 0 }}>Tickets</h2>
          <p className="muted">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} registrados</p>
        </div>
        {user?.role === "admin" && (
          <Link className="primary-btn" href="/tickets/new">
            <Plus size={15} /> Nuevo ticket
          </Link>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th className="table-hide-xs">Tecnico</th>
              <th>Estado</th>
              <th className="table-hide-xs">Prioridad</th>
              <th className="table-hide-xs">Programado</th>
              {user?.role === "admin" && <th className="table-hide-xs">SLA</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const tech = technicians.find((item) => item.id === ticket.technician_id);
              const sla  = user?.role === "admin" ? getSLA(ticket.scheduled_date, ticket.status) : null;
              return (
                <tr key={ticket.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.15rem" }}>
                      {ticket.ticket_type && (() => {
                        const m = TICKET_TYPE_META[ticket.ticket_type];
                        return (
                          <span style={{
                            padding: "0.1rem 0.35rem", borderRadius: "var(--r-sm)",
                            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em",
                            background: m.bg, color: m.color, border: `1px solid ${m.border}`,
                          }}>{m.prefix}</span>
                        );
                      })()}
                      <span style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--ink)" }}>{ticket.id}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 500 }}>{ticket.title}</p>
                    <p className="muted" style={{ fontSize: "0.76rem" }}>{ticket.address}</p>
                  </td>
                  <td className="table-hide-xs">{tech?.name ?? <span className="muted">Sin asignar</span>}</td>
                  <td><StatusPill status={ticket.status} /></td>
                  <td className="table-hide-xs"><PriorityPill priority={ticket.priority} /></td>
                  <td className="table-hide-xs" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {format(new Date(ticket.scheduled_date), "dd MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  {user?.role === "admin" && (
                    <td className="table-hide-xs">
                      {sla ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "0.18rem 0.5rem", borderRadius: "var(--r-sm)",
                          background: sla.bg, color: sla.color,
                          border: `1px solid ${sla.border}`,
                          fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap",
                        }}>
                          <Clock size={10} /> {sla.label}
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.74rem" }}>—</span>
                      )}
                    </td>
                  )}
                  <td><Link href={`/tickets/${ticket.id}`}>Ver</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="muted" style={{ padding: "1.5rem", textAlign: "center" }}>No hay tickets aun. Crea el primero.</p>
        )}
      </div>
    </section>
  );
}

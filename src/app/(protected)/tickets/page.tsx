"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { SLABadge, SLATimeRemaining } from "@/components/SLABadge";
import { useAppContext } from "@/context/AppContext";
import { TICKET_TYPE_META } from "@/types/domain";

export default function TicketsPage() {
  const { getVisibleTickets, technicians, user } = useAppContext();
  const tickets = getVisibleTickets();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 style={{ marginBottom: 0 }}>Tickets {user?.role === "admin" ? "(Administrador)" : "(Mis tickets)"}</h2>
          <p className="muted">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} {user?.role === "admin" ? "registrados" : "asignados"}</p>
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
              <th>SLA</th>
              <th className="table-hide-xs">Programado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const tech = technicians.find((item) => item.id === ticket.technician_id);
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
                  <td style={{ fontSize: "0.75rem" }}>
                    <SLABadge ticket={ticket} />
                    {ticket.sla_deadline && (
                      <div style={{ marginTop: "0.3rem", fontSize: "0.7rem" }}>
                        <SLATimeRemaining deadline={ticket.sla_deadline} />
                      </div>
                    )}
                  </td>
                  <td className="table-hide-xs" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {format(new Date(ticket.scheduled_date), "dd MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  <td><Link href={`/tickets/${ticket.id}`}>Ver</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="muted" style={{ padding: "1.5rem", textAlign: "center" }}>No hay tickets aun. {user?.role === "admin" ? "Crea el primero." : "Tu equipo no tiene tickets asignados."}</p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { SLAIndicator } from "@/components/SLAIndicator";
import { useAppContext } from "@/context/AppContext";
import { useSLAAlerts } from "@/hooks/useSLAAlerts";
import { TICKET_TYPE_META } from "@/types/domain";

export default function TicketsPage() {
  const { getVisibleTickets, getAvailableTickets, technicians, user, editTicket, tickets } = useAppContext();
  useSLAAlerts(tickets);
  const visibleTickets = getVisibleTickets();
  const availableTickets = getAvailableTickets();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);

  const handleAcceptTicket = async (ticketId: string) => {
    if (!user) return;
    setAccepting(ticketId);
    try {
      await editTicket(ticketId, { technician_id: user.id });
    } finally {
      setAccepting(null);
    }
  };

  const handleArchiveTicket = async (ticketId: string) => {
    if (!user || !confirm("¿Estás seguro de que deseas archivar este ticket?")) return;
    setArchiving(ticketId);
    try {
      // Marcar el ticket como archived (añadir campo is_archived = true)
      await editTicket(ticketId, { is_archived: true });
    } catch (error) {
      console.error("Error archiving ticket:", error);
      alert("Error al archivar el ticket. Por favor, intenta de nuevo.");
    } finally {
      setArchiving(null);
    }
  };

  const TicketTable = ({ tickets: ticketsData, title, isAvailable = false }: { tickets: any[], title: string, isAvailable?: boolean }) => (
    <div className="table-wrap" style={{ marginTop: title !== "Todos los Tickets" && title !== "Mis Tickets Asignados" ? "2rem" : 0 }}>
      <h3 style={{ marginBottom: "1rem", marginTop: 0, fontSize: "1rem", fontWeight: 600, color: "var(--ink)" }}>
        {title}
      </h3>
      <table>
        <thead>
          <tr>
            <th>Titulo</th>
            <th className="table-hide-xs">{title.includes("Disponibles") ? "Cliente" : "Tecnico"}</th>
            <th>Estado</th>
            <th className="table-hide-xs">Prioridad</th>
            <th>SLA</th>
            <th className="table-hide-xs">Programado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ticketsData.map((ticket) => {
            const tech = technicians.find((item) => item.id === ticket.technician_id);
            return (
              <tr key={ticket.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.15rem" }}>
                    {ticket.ticket_type && (() => {
                      const ticketType = ticket.ticket_type as keyof typeof TICKET_TYPE_META;
                      const m = TICKET_TYPE_META[ticketType];
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
                <td className="table-hide-xs">{title.includes("Disponibles") ? ticket.client_name : (tech?.name ?? <span className="muted">Sin asignar</span>)}</td>
                <td><StatusPill status={ticket.status} /></td>
                <td className="table-hide-xs"><PriorityPill priority={ticket.priority} /></td>
                <td style={{ fontSize: "0.75rem" }}>
                  <SLAIndicator
                    ticketId={ticket.id}
                    createdAt={ticket.created_at}
                    priority={ticket.priority}
                    status={ticket.status}
                    compact={true}
                  />
                </td>
                <td className="table-hide-xs" style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                  {format(new Date(ticket.scheduled_date), "dd MMM yyyy, HH:mm", { locale: es })}
                </td>
                <td>
                  {isAvailable ? (
                    <button
                      onClick={() => handleAcceptTicket(ticket.id)}
                      disabled={accepting === ticket.id}
                      style={{
                        padding: "0.35rem 0.75rem",
                        background: accepting === ticket.id ? "var(--line)" : "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--r-sm)",
                        cursor: accepting === ticket.id ? "not-allowed" : "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                    >
                      {accepting === ticket.id ? "Aceptando..." : "✓ Aceptar"}
                    </button>
                  ) : ticket.status === "completed" ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <Link href={`/tickets/${ticket.id}`} style={{ fontSize: "0.82rem" }}>Ver</Link>
                      <button
                        onClick={() => handleArchiveTicket(ticket.id)}
                        disabled={archiving === ticket.id}
                        title="Archivar ticket resuelto"
                        style={{
                          padding: "0.35rem 0.5rem",
                          background: archiving === ticket.id ? "var(--line)" : "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "var(--r-sm)",
                          cursor: archiving === ticket.id ? "not-allowed" : "pointer",
                          fontSize: "0.82rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          transition: "all 0.15s",
                        }}
                      >
                        <Trash2 size={14} />
                        {archiving === ticket.id && "..."}
                      </button>
                    </div>
                  ) : (
                    <Link href={`/tickets/${ticket.id}`}>Ver</Link>
                  )}
                </td>
              </tr>
            );
          })}
          {ticketsData.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)" }}>
                No hay tickets en esta sección
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 style={{ marginBottom: 0 }}>Tickets {user?.role === "admin" ? "(Administrador)" : "(Mis tickets)"}</h2>
          <p className="muted">
            {user?.role === "admin" 
              ? `${visibleTickets.length} ticket${visibleTickets.length !== 1 ? "s" : ""} registrados`
              : `${visibleTickets.length} asignado${visibleTickets.length !== 1 ? "s" : ""} | ${availableTickets.length} disponible${availableTickets.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {user?.role === "admin" && (
          <Link className="primary-btn" href="/tickets/new">
            <Plus size={15} /> Nuevo ticket
          </Link>
        )}
      </div>

      <TicketTable 
        tickets={visibleTickets} 
        title={user?.role === "admin" ? "Todos los Tickets" : "Mis Tickets Asignados"}
      />

      {/* SECCIÓN 2: TICKETS DISPONIBLES (solo técnicos) */}
      {user?.role !== "admin" && <TicketTable tickets={availableTickets} title="📋 Tickets Disponibles para Aceptar" isAvailable={true} />}

      {/* FALLBACK */}
      {visibleTickets.length === 0 && availableTickets.length === 0 && (
        <p className="muted" style={{ padding: "1.5rem", textAlign: "center" }}>
          No hay tickets. {user?.role === "admin" ? "Crea el primero." : "Tu equipo no tiene tickets."}
        </p>
      )}
    </section>
  );
}

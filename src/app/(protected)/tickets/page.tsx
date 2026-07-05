"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Ticket, TicketPriority, TicketType } from "@/types/domain";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { SLAIndicator } from "@/components/SLAIndicator";
import { useAppContext } from "@/context/AppContext";
import { useSLAAlerts } from "@/hooks/useSLAAlerts";
import { TICKET_TYPE_META } from "@/types/domain";

const TYPE_FILTERS: { value: "all" | TicketType; label: string }[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "support", label: "ST" },
  { value: "installation", label: "INS" },
  { value: "removal", label: "RT" },
];

const PRIORITY_FILTERS: { value: "all" | TicketPriority; label: string }[] = [
  { value: "all", label: "Toda prioridad" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

export default function TicketsPage() {
  const { getVisibleTickets, getAvailableTickets, getCompletedTickets, technicians, user, editTicket, tickets } = useAppContext();
  useSLAAlerts(tickets);
  const visibleTickets = getVisibleTickets();
  const availableTickets = getAvailableTickets();
  const completedTickets = getCompletedTickets();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TicketType>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");

  const { filteredVisible, filteredAvailable, filteredCompleted } = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matches = (ticket: Ticket) => {
      const matchesQuery =
        !q ||
        ticket.title.toLowerCase().includes(q) ||
        ticket.address.toLowerCase().includes(q) ||
        ticket.id.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || ticket.ticket_type === typeFilter;
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      return matchesQuery && matchesType && matchesPriority;
    };

    return {
      filteredVisible: visibleTickets.filter(matches),
      filteredAvailable: availableTickets.filter(matches),
      filteredCompleted: completedTickets.filter(matches),
    };
  }, [visibleTickets, availableTickets, completedTickets, query, typeFilter, priorityFilter]);

  const clearFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setPriorityFilter("all");
  };
  const hasActiveFilters = query !== "" || typeFilter !== "all" || priorityFilter !== "all";

  const summaryText =
    user?.role === "admin"
      ? `${visibleTickets.length} activo${visibleTickets.length !== 1 ? "s" : ""} | ${completedTickets.length} completado${completedTickets.length !== 1 ? "s" : ""}`
      : `${visibleTickets.length} asignado${visibleTickets.length !== 1 ? "s" : ""} | ${availableTickets.length} disponible${availableTickets.length !== 1 ? "s" : ""} | ${completedTickets.length} completado${completedTickets.length !== 1 ? "s" : ""}`;

  const handleAcceptTicket = async (ticketId: string) => {
    if (!user) return;
    setAccepting(ticketId);
    try {
      await editTicket(ticketId, { technician_id: user.id, status: "assigned" });
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

  const TicketTable = ({
    tickets: ticketsData,
    title,
    subtitle,
    isAvailable = false,
  }: {
    tickets: Ticket[];
    title: string;
    subtitle?: string;
    isAvailable?: boolean;
  }) => (
    <div className="surface-card overflow-hidden fade-in-up">
      <div className="px-5 py-4 border-b border-[#EAEAEA] bg-[#FBFBFA] flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Sección</p>
          <h3 className="text-base font-semibold text-[#111111] m-0 mt-1">{title}</h3>
          {subtitle && <p className="text-sm text-[#787774] mt-1 mb-0">{subtitle}</p>}
        </div>
        <span className="status-chip status-completed">{ticketsData.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Titulo</th>
              <th className="table-hide-xs">{isAvailable ? "Cliente" : "Tecnico"}</th>
              <th>Estado</th>
              <th className="table-hide-xs">Prioridad</th>
              <th>SLA</th>
              <th className="table-hide-xs">Programado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ticketsData.map((ticket) => {
              const tech = technicians.find((item) => item.id === ticket.technician_id);
              return (
                <tr key={ticket.id}>
                  <td>
                    <div className="flex items-center gap-1.5 mb-1">
                      {ticket.ticket_type && (() => {
                        const ticketType = ticket.ticket_type as keyof typeof TICKET_TYPE_META;
                        const m = TICKET_TYPE_META[ticketType];
                        return (
                          <span
                            style={{
                              background: m.bg,
                              color: m.color,
                              border: `1px solid ${m.border}`,
                            }}
                            className="status-chip"
                          >
                            {m.prefix}
                          </span>
                        );
                      })()}
                      <span className="text-xs font-semibold text-[#2f3437]">{ticket.id}</span>
                    </div>
                    <p className="m-0 font-medium text-[#111111]">{ticket.title}</p>
                    <p className="m-0 text-xs text-[#787774]">{ticket.address}</p>
                  </td>
                  <td className="table-hide-xs">
                    {isAvailable ? ticket.client_name : (tech?.name ?? <span className="text-[#787774]">Sin asignar</span>)}
                  </td>
                  <td><StatusPill status={ticket.status} /></td>
                  <td className="table-hide-xs"><PriorityPill priority={ticket.priority} /></td>
                  <td className="text-xs">
                    {ticket.created_at ? (
                      <SLAIndicator ticket={ticket} compact={true} />
                    ) : (
                      <span className="text-xs text-[#787774]">Sin fecha</span>
                    )}
                  </td>
                  <td className="table-hide-xs text-sm text-stone-500">
                    {format(new Date(ticket.scheduled_date), "dd MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  <td>
                    {isAvailable ? (
                      <button
                        onClick={() => handleAcceptTicket(ticket.id)}
                        disabled={accepting === ticket.id}
                        className="primary-btn text-xs px-3 py-1.5"
                      >
                        {accepting === ticket.id ? "Aceptando..." : "Aceptar"}
                      </button>
                    ) : ticket.status === "completed" ? (
                      <div className="flex items-center gap-2">
                        <Link href={`/tickets/${ticket.id}`} className="text-xs font-medium text-[#2f3437] underline-offset-2 hover:underline">
                          Ver
                        </Link>
                        <button
                          onClick={() => handleArchiveTicket(ticket.id)}
                          disabled={archiving === ticket.id}
                          title="Archivar ticket resuelto"
                          className="inline-flex items-center gap-1 rounded-md border border-[#f3c1c1] bg-[#fdebec] px-2 py-1.5 text-xs font-semibold text-[#9f2f2d] transition-colors hover:bg-[#f9dcdc] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 size={13} />
                          {archiving === ticket.id ? "..." : "Archivar"}
                        </button>
                      </div>
                    ) : (
                      <Link href={`/tickets/${ticket.id}`} className="text-xs font-medium text-[#2f3437] underline-offset-2 hover:underline">
                        Ver
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {ticketsData.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#787774]">
                  No hay tickets en esta sección
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="surface-card p-6 md:p-8 fade-in-up">
        <p className="eyebrow">Centro de tickets</p>
        <h1 className="editorial-title text-4xl md:text-5xl text-[#111111] mt-2">Gestión de tickets</h1>
        <p className="mt-3 max-w-3xl text-sm md:text-base text-[#787774] leading-6">{summaryText}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 fade-in-up" style={{ ["--delay" as any]: "80ms" }}>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#787774] m-0">Activos</p>
          <p className="text-3xl font-semibold text-[#111111] m-0 mt-1">{visibleTickets.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#787774] m-0">Disponibles</p>
          <p className="text-3xl font-semibold text-[#111111] m-0 mt-1">{availableTickets.length}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[#787774] m-0">Completados</p>
          <p className="text-3xl font-semibold text-[#111111] m-0 mt-1">{completedTickets.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 fade-in-up" style={{ ["--delay" as any]: "120ms" }}>
        <div>
          <p className="eyebrow">Vista operativa</p>
          <h2 className="m-0 text-lg font-semibold text-[#111111] mt-1">
            {user?.role === "admin" ? "Administrador" : "Técnico"}
          </h2>
          <p className="m-0 text-sm text-[#787774]">Seguimiento operativo en tiempo real</p>
        </div>
        {user?.role === "admin" && (
          <Link
            href="/tickets/new"
            className="primary-btn"
          >
            <Plus size={15} /> Nuevo Ticket
          </Link>
        )}
      </div>

      <div className="surface-card p-4 flex flex-wrap items-center gap-3 fade-in-up">
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={14} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, dirección o ID..."
            style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 2rem", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "0.84rem", background: "var(--surface)", color: "var(--ink)" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | TicketType)}
          style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "0.84rem", background: "var(--surface)", color: "var(--ink)" }}
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | TicketPriority)}
          style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "0.84rem", background: "var(--surface)", color: "var(--ink)" }}
        >
          {PRIORITY_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button type="button" className="outline-btn" style={{ fontSize: "0.8rem" }} onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <TicketTable
        tickets={filteredVisible}
        title={user?.role === "admin" ? "Todos los Tickets" : "Mis Tickets Asignados"}
        subtitle="Listado principal de trabajo"
      />

      {user?.role !== "admin" && (
        <TicketTable
          tickets={filteredAvailable}
          title="Tickets Disponibles para Aceptar"
          subtitle="Toma de tickets no asignados"
          isAvailable={true}
        />
      )}

      {completedTickets.length > 0 && (
        <TicketTable
          tickets={filteredCompleted}
          title={user?.role === "admin" ? "Historial de Completados" : "Mis Tickets Completados"}
          subtitle={`${completedTickets.length} ticket${completedTickets.length !== 1 ? "s" : ""} completado${completedTickets.length !== 1 ? "s" : ""}`}
        />
      )}

      {visibleTickets.length === 0 && availableTickets.length === 0 && completedTickets.length === 0 && (
        <div className="surface-card p-8 text-center text-[#787774]">
          No hay tickets. {user?.role === "admin" ? "Crea el primero." : "Tu equipo no tiene tickets."}
        </div>
      )}
    </section>
  );
}

"use client";

import { Ticket, TicketStatus } from "@/types/domain";
import { calculateSLAMetrics } from "@/lib/slaMetrics";
import { SLATimelineBar } from "./SLAVisualizer";

interface TechnicianSLAViewProps {
  tickets: Ticket[];
}

type ActiveTicketStatus = Exclude<TicketStatus, "completed" | "not_completed">;

function isActiveTicket(ticket: Ticket): ticket is Ticket & { status: ActiveTicketStatus } {
  return ticket.status !== "completed" && ticket.status !== "not_completed";
}

export function TechnicianSLAView({ tickets }: TechnicianSLAViewProps) {
  const activeTickets = tickets.filter(isActiveTicket);
  const criticalTickets = activeTickets.filter((t) => {
    const metrics = calculateSLAMetrics(t);
    return metrics.level === "critical" || metrics.level === "overdue";
  });

  if (activeTickets.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}
      >
        <p style={{ margin: 0, fontSize: "1.1rem", color: "#64748b", fontWeight: "500" }}>
          ✓ No tienes tickets activos
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: "0.9rem", color: "#94a3b8" }}>
          Bien hecho, mantén el buen trabajo
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Resumen superior */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        <div
          style={{
            padding: "12px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "#1e40af", fontWeight: "600" }}>
            Total Activos
          </p>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#1e40af" }}>
            {activeTickets.length}
          </p>
        </div>

        {criticalTickets.length > 0 && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
            }}
          >
            <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "#7f1d1d", fontWeight: "600" }}>
              🚨 Críticos
            </p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#ef4444" }}>
              {criticalTickets.length}
            </p>
          </div>
        )}

        <div
          style={{
            padding: "12px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "#166534", fontWeight: "600" }}>
            Completados
          </p>
          <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#10b981" }}>
            {tickets.filter((t) => t.status === "completed" || t.status === "not_completed").length}
          </p>
        </div>
      </div>

      {/* Alerta crítica si hay */}
      {criticalTickets.length > 0 && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fef2f2",
            border: "2px solid #ef4444",
            borderRadius: "8px",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontSize: "1rem", fontWeight: "700", color: "#7f1d1d" }}>
            🚨 Acción Inmediata Requerida
          </p>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#7f1d1d" }}>
            Tienes {criticalTickets.length} ticket{criticalTickets.length > 1 ? "s" : ""} con SLA crítico.
            Prioriza estos trabajos para evitar incumplimiento.
          </p>
        </div>
      )}

      {/* Lista de tickets con SLA */}
      <div>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", fontWeight: "600", color: "#1e293b" }}>
          📋 Mis Tickets Activos
        </h3>

        <div style={{ display: "grid", gap: "16px" }}>
          {activeTickets.map((ticket) => {
            const metrics = calculateSLAMetrics(ticket);
            const statusColor = {
              pending: "#94a3b8",
              assigned: "#3b82f6",
              in_progress: "#8b5cf6",
            }[ticket.status] || "#64748b";

            return (
              <div
                key={ticket.id}
                style={{
                  padding: "16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {/* Header del ticket */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: "600", color: "#1e293b" }}>
                      {ticket.title}
                    </h4>
                    <div style={{ display: "flex", gap: "12px", fontSize: "0.8rem", color: "#64748b" }}>
                      <span>🏢 {ticket.client_name || "Sin cliente"}</span>
                      <span>📍 {ticket.address.substring(0, 30)}...</span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      backgroundColor: statusColor + "20",
                      color: statusColor,
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    {ticket.status === "pending" && "Pendiente"}
                    {ticket.status === "assigned" && "Asignado"}
                    {ticket.status === "in_progress" && "En Progreso"}
                  </div>
                </div>

                {/* Descripción */}
                <p style={{ margin: "0 0 12px 0", fontSize: "0.85rem", color: "#64748b", lineHeight: "1.5" }}>
                  {ticket.description}
                </p>

                {/* Barra SLA */}
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <SLATimelineBar ticket={ticket} />
                </div>

                {/* Footer con prioridad */}
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      backgroundColor:
                        ticket.priority === "high" ? "#fee2e2" : ticket.priority === "medium" ? "#fef3c7" : "#f0fdf4",
                      color:
                        ticket.priority === "high" ? "#991b1b" : ticket.priority === "medium" ? "#92400e" : "#166534",
                    }}
                  >
                    {ticket.priority === "high" && "🔴 ALTA PRIORIDAD"}
                    {ticket.priority === "medium" && "🟡 PRIORIDAD MEDIA"}
                    {ticket.priority === "low" && "🟢 BAJA PRIORIDAD"}
                  </div>

                  {metrics.level === "critical" || metrics.level === "overdue" ? (
                    <a
                      href={`/tickets/${ticket.id}`}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Actuar Ahora
                    </a>
                  ) : (
                    <a
                      href={`/tickets/${ticket.id}`}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Ver Detalles
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips profesionales */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
        }}
      >
        <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: "600", color: "#166534" }}>
          💡 Consejos para cumplir SLA:
        </p>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", color: "#166534", fontSize: "0.85rem" }}>
          <li>Prioriza tickets con estado 🔴 Crítico</li>
          <li>Revisa la barra de progreso para gestionar tu tiempo</li>
          <li>Actualiza el estado del ticket frecuentemente</li>
          <li>Si necesitas más tiempo, comunícalo al admin</li>
        </ul>
      </div>
    </div>
  );
}

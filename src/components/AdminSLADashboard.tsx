"use client";

import { useAppContext } from "@/context/AppContext";
import {
  calculateSLACompliance,
  calculateSLAMetrics,
  getCriticalTickets,
  groupTicketsBySLA,
} from "@/lib/slaMetrics";
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Ticket } from "@/types/domain";
import { SLATimelineBar, SLABadgeCompact } from "./SLAVisualizer";

export function AdminSLADashboard() {
  const { tickets } = useAppContext();

  const activeTickets = tickets.filter(
    (t) => t.status !== "completed" && t.status !== "not_completed"
  );
  const compliance = calculateSLACompliance(tickets);
  const critical = getCriticalTickets(tickets);
  const grouped = groupTicketsBySLA(tickets);

  const complianceColor =
    compliance.percentage >= 95 ? "#10b981" : compliance.percentage >= 80 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ display: "grid", gap: "24px", padding: "20px" }}>
      {/* Título */}
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0" }}>
          📊 Dashboard SLA
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          Monitoreo profesional de cumplimiento de acuerdos de nivel de servicio
        </p>
      </div>

      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        {/* Cumplimiento total */}
        <div
          style={{
            padding: "16px",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: complianceColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Cumplimiento SLA</p>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "700", color: complianceColor }}>
                {compliance.percentage}%
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            {compliance.compliant} de {compliance.total} completados en tiempo
          </p>
        </div>

        {/* Tickets críticos */}
        <div
          style={{
            padding: "16px",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertCircle size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Críticos</p>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "700", color: "#ef4444" }}>
                {critical.length}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            Tickets que requieren atención inmediata
          </p>
        </div>

        {/* En progreso */}
        <div
          style={{
            padding: "16px",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            backgroundColor: "#eff6ff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>En progreso</p>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "700", color: "#3b82f6" }}>
                {activeTickets.length}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            Tickets activos actualmente
          </p>
        </div>

        {/* Completados */}
        <div
          style={{
            padding: "16px",
            border: "1px solid #86efac",
            borderRadius: "8px",
            backgroundColor: "#f0fdf4",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle size={20} color="white" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Completados</p>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: "700", color: "#10b981" }}>
                {grouped.completed.length}
              </p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
            Total de tickets cerrados
          </p>
        </div>
      </div>

      {/* Tickets críticos - Requiere atención */}
      {critical.length > 0 && (
        <div style={{ padding: "20px", border: "2px solid #fecaca", borderRadius: "8px", backgroundColor: "#fef2f2" }}>
          <h3
            style={{
              margin: "0 0 16px 0",
              fontSize: "1.1rem",
              fontWeight: "700",
              color: "#7f1d1d",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={20} />
            🚨 {critical.length} Tickets Críticos - Requiere Atención Inmediata
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {critical.slice(0, 5).map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  padding: "12px",
                  backgroundColor: "white",
                  borderRadius: "6px",
                  border: "1px solid #fecaca",
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 150px",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <SLABadgeCompact ticket={ticket} />
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "600", fontSize: "0.9rem" }}>
                    {ticket.title}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                    {ticket.client_name} • {ticket.priority.toUpperCase()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      color: "#ef4444",
                    }}
                  >
                    {calculateSLAMetrics(ticket).message}
                  </p>
                </div>
              </div>
            ))}
            {critical.length > 5 && (
              <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                +{critical.length - 5} más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Distribución de tickets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
        {/* OK */}
        <div style={{ padding: "16px", border: "1px solid #86efac", borderRadius: "8px", backgroundColor: "#f0fdf4" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", fontWeight: "600", color: "#166534" }}>
            ✓ En Tiempo ({grouped.ok.length})
          </h4>
          <div style={{ display: "grid", gap: "8px" }}>
            {grouped.ok.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "8px",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.title}
              </div>
            ))}
            {grouped.ok.length > 3 && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                +{grouped.ok.length - 3} más
              </p>
            )}
          </div>
        </div>

        {/* WARNING */}
        <div
          style={{ padding: "16px", border: "1px solid #fcd34d", borderRadius: "8px", backgroundColor: "#fffbeb" }}
        >
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", fontWeight: "600", color: "#92400e" }}>
            ⚠ Alerta ({grouped.warning.length})
          </h4>
          <div style={{ display: "grid", gap: "8px" }}>
            {grouped.warning.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "8px",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.title}
              </div>
            ))}
            {grouped.warning.length > 3 && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                +{grouped.warning.length - 3} más
              </p>
            )}
          </div>
        </div>

        {/* CRITICAL */}
        <div
          style={{ padding: "16px", border: "1px solid #fecaca", borderRadius: "8px", backgroundColor: "#fef2f2" }}
        >
          <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", fontWeight: "600", color: "#7f1d1d" }}>
            🔴 Crítico ({grouped.critical.length + grouped.overdue.length})
          </h4>
          <div style={{ display: "grid", gap: "8px" }}>
            {grouped.critical.slice(0, 3).map((t) => (
              <div
                key={t.id}
                style={{
                  padding: "8px",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.title}
              </div>
            ))}
            {grouped.critical.length + grouped.overdue.length > 3 && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                +{grouped.critical.length + grouped.overdue.length - 3} más
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

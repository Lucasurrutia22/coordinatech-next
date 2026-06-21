"use client";

import { Ticket } from "@/types/domain";
import { calculateSLAMetrics, formatSLATime } from "@/lib/slaMetrics";

export function SLATimelineBar({ ticket }: { ticket: Ticket }) {
  const metrics = calculateSLAMetrics(ticket);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Header con icono y estado */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontSize: "18px" }}>{metrics.displayIcon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: metrics.displayColor }}>
            {metrics.level.toUpperCase()}
          </p>
        </div>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
          {formatSLATime(metrics.timeRemaining.days, metrics.timeRemaining.hours, metrics.timeRemaining.minutes)}
        </p>
      </div>

      {/* Barra de progreso */}
      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#e2e8f0",
          borderRadius: "4px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, metrics.percentRemaining))}%`,
            height: "100%",
            backgroundColor: metrics.displayColor,
            transition: "width 0.3s ease",
            borderRadius: "4px",
          }}
        />
      </div>

      {/* Información detallada */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.8rem" }}>
        <div>
          <p style={{ margin: "0 0 4px 0", color: "#64748b", fontWeight: "500" }}>Estado</p>
          <p style={{ margin: 0, color: metrics.displayColor, fontWeight: "600" }}>
            {metrics.level === "ok" ? "✓ En tiempo" : metrics.message}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 4px 0", color: "#64748b", fontWeight: "500" }}>Vencimiento</p>
          <p style={{ margin: 0, fontWeight: "500", color: "#1e293b" }}>
            {new Date(metrics.deadline).toLocaleString("es-ES", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SLABadgeCompact({ ticket }: { ticket: Ticket }) {
  const metrics = calculateSLAMetrics(ticket);

  const badgeStyles = {
    ok: { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
    warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
    critical: { bg: "#fef2f2", border: "#fecaca", text: "#7f1d1d" },
    overdue: { bg: "#fef2f2", border: "#fecaca", text: "#7f1d1d" },
    completed: { bg: "#f0fdf4", border: "#86efac", text: "#166534" },
  };

  const style = badgeStyles[metrics.level];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px",
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "600",
        color: style.text,
      }}
    >
      <span>{metrics.displayIcon}</span>
      <span>{Math.round(metrics.percentRemaining)}%</span>
    </div>
  );
}

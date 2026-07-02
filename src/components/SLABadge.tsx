"use client";

import { Ticket } from "@/types/domain";

export function SLABadge({ ticket }: { ticket: Ticket }) {
  if (!ticket.sla_status) {
    return null;
  }

  const statusConfig = {
    healthy: {
      label: "SLA en orden",
      className: "status-completed",
      color: "#16a34a",
    },
    warning: {
      label: "SLA en alerta",
      className: "status-assigned",
      color: "#d97706",
    },
    critical: {
      label: "SLA vencido",
      className: "status-pending",
      color: "#dc2626",
    },
  };

  const config = statusConfig[ticket.sla_status];

  return (
    <span
      className={`status-chip ${config.className}`}
      title={`Vencimiento SLA: ${ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString() : "N/A"}`}
      style={{ fontSize: "0.7rem", marginLeft: "0.5rem" }}
    >
      {config.label}
    </span>
  );
}

export function SLATimeRemaining({ deadline }: { deadline?: string }) {
  if (!deadline) {
    return null;
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs < 0) {
    return <span style={{ color: "#9f2f2d" }}>Vencido hace {formatTimeDiff(-diffMs)}</span>;
  }

  return <span style={{ color: "#346538" }}>Quedan {formatTimeDiff(diffMs)}</span>;
}

function formatTimeDiff(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

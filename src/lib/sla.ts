import { Ticket, TicketPriority, SLA_HOURS } from "@/types/domain";

/**
 * Calcula la fecha de vencimiento del SLA según la prioridad y fecha de creación
 */
export function calculateSLADeadline(
  createdAt: string,
  priority: TicketPriority,
): string {
  const hours = SLA_HOURS[priority];
  const date = new Date(createdAt);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

/**
 * Calcula el estado del SLA: healthy (>30% tiempo), warning (10-30%), critical (<10%)
 */
export function calculateSLAStatus(
  deadline: string,
  status: Ticket["status"],
): Ticket["sla_status"] {
  // Si está completado o no completado, no tiene SLA activo
  if (status === "completed" || status === "not_completed") {
    return "healthy";
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);

  // Si ya pasó la fecha límite
  if (now > deadlineDate) {
    return "critical";
  }

  // Calcula tiempo restante
  const totalMs = deadlineDate.getTime() - new Date(deadline).getTime() + (now.getTime() - deadlineDate.getTime());
  const remainingMs = deadlineDate.getTime() - now.getTime();
  const remainingPercent = (remainingMs / totalMs) * 100;

  if (remainingPercent > 30) {
    return "healthy";
  } else if (remainingPercent > 10) {
    return "warning";
  } else {
    return "critical";
  }
}

/**
 * Enriquece un ticket con información de SLA
 */
export function enrichTicketWithSLA(ticket: Ticket): Ticket {
  if (!ticket.created_at) {
    return ticket;
  }

  const slaDeadline =
    ticket.sla_deadline || calculateSLADeadline(ticket.created_at, ticket.priority);
  const slaStatus = calculateSLAStatus(slaDeadline, ticket.status);

  return {
    ...ticket,
    sla_deadline: slaDeadline,
    sla_status: slaStatus,
  };
}

/**
 * Calcula el porcentaje de cumplimiento de SLA
 */
export function calculateSLACompliance(tickets: Ticket[]): {
  total: number;
  compliant: number;
  percentage: number;
} {
  const completedTickets = tickets.filter(
    (t) => t.status === "completed" || t.status === "not_completed",
  );

  if (completedTickets.length === 0) {
    return { total: 0, compliant: 0, percentage: 100 };
  }

  const compliant = completedTickets.filter((t) => {
    if (t.sla_status === "critical") {
      return false;
    }
    if (!t.sla_deadline) {
      return true;
    }
    return new Date() <= new Date(t.sla_deadline);
  }).length;

  return {
    total: completedTickets.length,
    compliant,
    percentage: Math.round((compliant / completedTickets.length) * 100),
  };
}

/**
 * Agrupa tickets por estado de SLA
 */
export function groupTicketsBySLAStatus(tickets: Ticket[]): {
  healthy: Ticket[];
  warning: Ticket[];
  critical: Ticket[];
} {
  return {
    healthy: tickets.filter((t) => t.sla_status === "healthy"),
    warning: tickets.filter((t) => t.sla_status === "warning"),
    critical: tickets.filter((t) => t.sla_status === "critical"),
  };
}

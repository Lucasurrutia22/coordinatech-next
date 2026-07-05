import { SLA_CONFIG, SLALevel, Ticket, TicketType } from "@/types/domain";

export type { SLALevel };

function resolveTicketType(ticket: Pick<Ticket, "ticket_type">): TicketType {
  return ticket.ticket_type && SLA_CONFIG[ticket.ticket_type] ? ticket.ticket_type : "support";
}

function calculateSLADeadline(createdAt: string, ticketType: TicketType): string {
  const config = SLA_CONFIG[ticketType] ?? SLA_CONFIG.support;
  const date = new Date(createdAt);
  date.setMinutes(date.getMinutes() + config.timeWindowMinutes);
  return date.toISOString();
}

export interface SLAMetrics {
  level: SLALevel;
  percentRemaining: number;
  hoursRemaining: number;
  timeWindowMinutes: number;
  timeRemaining: { days: number; hours: number; minutes: number };
  deadline: Date;
  isOverdue: boolean;
}

/** Calcula el estado y tiempo restante de SLA para un ticket, según su tipo (ST/INS/RT). */
export function calculateSLAMetrics(ticket: Ticket): SLAMetrics {
  const now = new Date();
  const ticketType = resolveTicketType(ticket);
  const config = SLA_CONFIG[ticketType];

  if (ticket.status === "not_completed") {
    // No completar el trabajo es en sí mismo un incumplimiento de SLA,
    // independiente de cuánto tiempo haya tomado — no tiene sentido reportarlo
    // como "cumplido a tiempo" solo porque se cerró (sin éxito) dentro del plazo.
    const deadline = new Date(ticket.sla_deadline || now);
    return {
      level: "overdue",
      percentRemaining: 0,
      hoursRemaining: 0,
      timeWindowMinutes: config.timeWindowMinutes,
      timeRemaining: { days: 0, hours: 0, minutes: 0 },
      deadline,
      isOverdue: true,
    };
  }

  if (ticket.status === "completed") {
    const deadline = new Date(ticket.sla_deadline || now);
    // Si tenemos el timestamp real de cierre, comparamos contra el deadline para saber
    // si el ticket violó su SLA aunque ya esté cerrado (no todo lo "completado" cumplió a tiempo).
    // Sin ese dato (tickets cerrados antes de que se empezara a registrar) asumimos cumplido,
    // que es el comportamiento previo — no podemos inferir retroactivamente lo que no se guardó.
    const completedAt = ticket.work_ended_at ? new Date(ticket.work_ended_at) : null;
    const breached = completedAt !== null && !Number.isNaN(completedAt.getTime()) && completedAt.getTime() > deadline.getTime();

    return {
      level: breached ? "overdue" : "completed",
      percentRemaining: breached ? 0 : 100,
      hoursRemaining: 0,
      timeWindowMinutes: config.timeWindowMinutes,
      timeRemaining: { days: 0, hours: 0, minutes: 0 },
      deadline,
      isOverdue: breached,
    };
  }

  const createdAt = new Date(ticket.created_at || now);
  const deadline = ticket.sla_deadline
    ? new Date(ticket.sla_deadline)
    : new Date(createdAt.getTime() + config.timeWindowMinutes * 60_000);

  const totalMs = deadline.getTime() - createdAt.getTime();
  const remainingMs = deadline.getTime() - now.getTime();
  const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

  let level: SLALevel;
  if (remainingMs < 0) {
    level = "overdue";
  } else if (percentRemaining <= config.criticalPercent) {
    level = "critical";
  } else if (percentRemaining <= config.warningPercent) {
    level = "warning";
  } else {
    level = "ok";
  }

  const absDiffMs = Math.abs(remainingMs);

  return {
    level,
    percentRemaining: Math.max(0, Math.round(percentRemaining)),
    hoursRemaining: Math.max(0, remainingMs / 3_600_000),
    timeWindowMinutes: config.timeWindowMinutes,
    timeRemaining: {
      days: Math.floor(absDiffMs / 86_400_000),
      hours: Math.floor((absDiffMs / 3_600_000) % 24),
      minutes: Math.floor((absDiffMs / 60_000) % 60),
    },
    deadline,
    isOverdue: remainingMs < 0,
  };
}

/** Enriquece un ticket con sla_deadline/sla_status persistibles. Usado por repository.ts en cada fetch/create/update. */
export function enrichTicketWithSLA(ticket: Ticket): Ticket {
  if (!ticket.created_at) {
    return ticket;
  }

  const ticketType = resolveTicketType(ticket);
  const slaDeadline = ticket.sla_deadline || calculateSLADeadline(ticket.created_at, ticketType);
  const metrics = calculateSLAMetrics({ ...ticket, sla_deadline: slaDeadline });

  return {
    ...ticket,
    sla_deadline: slaDeadline,
    sla_status: metrics.level,
  };
}

export function calculateSLACompliance(tickets: Ticket[]): {
  total: number;
  compliant: number;
  percentage: number;
  critical: number;
  warning: number;
} {
  const completed = tickets.filter((t) => t.status === "completed" || t.status === "not_completed");

  if (completed.length === 0) {
    return { total: 0, compliant: 0, percentage: 100, critical: 0, warning: 0 };
  }

  let compliant = 0;
  let critical = 0;
  let warning = 0;

  completed.forEach((ticket) => {
    const { level } = calculateSLAMetrics(ticket);
    if (level === "ok" || level === "completed") compliant += 1;
    else if (level === "critical" || level === "overdue") critical += 1;
    else if (level === "warning") warning += 1;
  });

  return {
    total: completed.length,
    compliant,
    percentage: Math.round((compliant / completed.length) * 100),
    critical,
    warning,
  };
}

export function groupTicketsBySLAStatus(tickets: Ticket[]): Record<SLALevel, Ticket[]> {
  const groups: Record<SLALevel, Ticket[]> = { ok: [], warning: [], critical: [], overdue: [], completed: [] };
  tickets.forEach((ticket) => {
    groups[calculateSLAMetrics(ticket).level].push(ticket);
  });
  return groups;
}

export function getCriticalTickets(tickets: Ticket[]): Ticket[] {
  return tickets.filter((ticket) => {
    const { level } = calculateSLAMetrics(ticket);
    return level === "critical" || level === "overdue";
  });
}

export function formatSLATime(days: number, hours: number, minutes: number): string {
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

import { Ticket, TicketPriority, SLA_HOURS } from "@/types/domain";

/**
 * Configuración profesional de SLA
 * Basada en estándares de industria
 */
export const SLA_CONFIG = {
  high: {
    timeWindow: 4 * 60, // 4 horas en minutos
    warning: 25, // % de tiempo restante para alerta
    critical: 10, // % de tiempo restante para crítico
  },
  medium: {
    timeWindow: 24 * 60, // 24 horas
    warning: 25,
    critical: 10,
  },
  low: {
    timeWindow: 48 * 60, // 48 horas
    warning: 25,
    critical: 10,
  },
};

export type SLALevel = "ok" | "warning" | "critical" | "overdue" | "completed";

export interface SLAMetrics {
  level: SLALevel;
  percentRemaining: number;
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  deadline: Date;
  hoursRemaining: number;
  isOverdue: boolean;
  message: string;
  displayColor: string;
  displayIcon: string;
}

/**
 * Calcula métricas SLA profesionales para un ticket
 */
export function calculateSLAMetrics(ticket: Ticket): SLAMetrics {
  const now = new Date();

  // Si está completado o no completado
  if (ticket.status === "completed" || ticket.status === "not_completed") {
    return {
      level: "completed",
      percentRemaining: 100,
      timeRemaining: { days: 0, hours: 0, minutes: 0 },
      deadline: new Date(ticket.sla_deadline || new Date()),
      hoursRemaining: 0,
      isOverdue: false,
      message: "Ticket completado",
      displayColor: "#10b981",
      displayIcon: "✓",
    };
  }

  // Obtener configuración según prioridad
  const config = SLA_CONFIG[ticket.priority as TicketPriority];
  
  // Calcular deadline
  const createdAt = new Date(ticket.created_at || now);
  const deadline = new Date(createdAt.getTime() + config.timeWindow * 60 * 1000);

  // Calcular tiempo restante
  const diffMs = deadline.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  const percentRemaining = (diffMinutes / config.timeWindow) * 100;

  // Determinar nivel
  let level: SLALevel;
  if (diffMs < 0) {
    level = "overdue";
  } else if (percentRemaining <= config.critical) {
    level = "critical";
  } else if (percentRemaining <= config.warning) {
    level = "warning";
  } else {
    level = "ok";
  }

  // Calcular formato de tiempo
  const absDiffMs = Math.abs(diffMs);
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absDiffMs / (1000 * 60)) % 60);

  // Configurar colores y mensajes
  const config_visual = {
    ok: {
      color: "#10b981",
      icon: "🟢",
      message: `${Math.round(percentRemaining)}% tiempo restante`,
    },
    warning: {
      color: "#f59e0b",
      icon: "🟡",
      message: `⚠ ${Math.round(percentRemaining)}% tiempo restante`,
    },
    critical: {
      color: "#ef4444",
      icon: "🔴",
      message: `🚨 ${Math.round(percentRemaining)}% tiempo restante`,
    },
    overdue: {
      color: "#7f1d1d",
      icon: "❌",
      message: `Vencido hace ${days}d ${hours}h`,
    },
    completed: {
      color: "#10b981",
      icon: "✓",
      message: "Completado",
    },
  };

  const visual = config_visual[level];

  return {
    level,
    percentRemaining: Math.max(0, Math.round(percentRemaining)),
    timeRemaining: {
      days,
      hours,
      minutes,
    },
    deadline,
    hoursRemaining: Math.max(0, diffMinutes / 60),
    isOverdue: diffMs < 0,
    message: visual.message,
    displayColor: visual.color,
    displayIcon: visual.icon,
  };
}

/**
 * Calcula cumplimiento de SLA para múltiples tickets
 */
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
    const metrics = calculateSLAMetrics(ticket);
    if (metrics.level === "ok" || metrics.level === "completed") {
      compliant++;
    } else if (metrics.level === "critical" || metrics.level === "overdue") {
      critical++;
    } else if (metrics.level === "warning") {
      warning++;
    }
  });

  return {
    total: completed.length,
    compliant,
    percentage: Math.round((compliant / completed.length) * 100),
    critical,
    warning,
  };
}

/**
 * Obtiene tickets críticos que necesitan atención
 */
export function getCriticalTickets(tickets: Ticket[]): Ticket[] {
  return tickets
    .filter((t) => t.status !== "completed" && t.status !== "not_completed")
    .map((t) => ({ ticket: t, metrics: calculateSLAMetrics(t) }))
    .filter(({ metrics }) => metrics.level === "critical" || metrics.level === "overdue")
    .map(({ ticket }) => ticket);
}

/**
 * Agrupa tickets por estado SLA
 */
export function groupTicketsBySLA(tickets: Ticket[]): Record<SLALevel, Ticket[]> {
  const groups: Record<SLALevel, Ticket[]> = {
    ok: [],
    warning: [],
    critical: [],
    overdue: [],
    completed: [],
  };

  tickets.forEach((ticket) => {
    const metrics = calculateSLAMetrics(ticket);
    groups[metrics.level].push(ticket);
  });

  return groups;
}

/**
 * Formatea tiempo para visualización
 */
export function formatSLATime(
  days: number,
  hours: number,
  minutes: number,
): string {
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

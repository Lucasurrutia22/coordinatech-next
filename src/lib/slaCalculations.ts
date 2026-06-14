// Cálculo de SLA según el documento: alertas cuando < 15% de tiempo
export interface SLACalculation {
  hoursRemaining: number;
  percentRemaining: number;
  status: 'critical' | 'warning' | 'ok' | 'completed';
  timeWindow: number;
}

export function calculateSLA(
  createdAt: Date,
  priority: 'low' | 'medium' | 'high',
  status: string
): SLACalculation {
  // SLA según prioridad (en horas)
  const slaWindow: Record<string, number> = {
    low: 48,
    medium: 24,
    high: 4,
  };

  const timeWindow = slaWindow[priority] || 24;
  const now = new Date();
  const createdTime = new Date(createdAt);
  const elapsedMs = now.getTime() - createdTime.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, timeWindow - elapsedHours);
  const percentRemaining = (hoursRemaining / timeWindow) * 100;

  // Determinar estado según lo especificado en el documento
  if (status === 'completed') {
    return {
      hoursRemaining: 0,
      percentRemaining: 100,
      status: 'completed',
      timeWindow,
    };
  }

  let slaStatus: 'critical' | 'warning' | 'ok';
  if (percentRemaining <= 15) {
    slaStatus = 'critical';
  } else if (percentRemaining <= 30) {
    slaStatus = 'warning';
  } else {
    slaStatus = 'ok';
  }

  return {
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    percentRemaining: Math.round(percentRemaining * 10) / 10,
    status: slaStatus,
    timeWindow,
  };
}

// Calcular métrica de cumplimiento de SLA
export function calculateSLACompliance(
  tickets: Array<{
    created_at: string;
    priority: string;
    status: string;
  }>
): number {
  if (tickets.length === 0) return 100;

  const completedOnTime = tickets.filter((ticket) => {
    const sla = calculateSLA(
      new Date(ticket.created_at),
      ticket.priority as any,
      ticket.status
    );
    // Un ticket está "on time" si fue completado o si aún está dentro del SLA
    return ticket.status === 'completed' || sla.percentRemaining > 0;
  }).length;

  return (completedOnTime / tickets.length) * 100;
}

// Detectar alertas críticas
export function getCriticalAlerts(
  tickets: Array<{
    id: string;
    description: string;
    created_at: string;
    priority: string;
    status: string;
  }>
) {
  return tickets
    .map((ticket) => ({
      ticket,
      sla: calculateSLA(new Date(ticket.created_at), ticket.priority as any, ticket.status),
    }))
    .filter(({ sla }) => sla.status === 'critical')
    .map(({ ticket, sla }) => ({
      ticketId: ticket.id,
      description: ticket.description,
      hoursRemaining: sla.hoursRemaining,
      percentRemaining: sla.percentRemaining,
    }));
}

// Calcular métricas agregadas
export interface AggregatedMetrics {
  totalTickets: number;
  completedToday: number;
  pendingTickets: number;
  slaComplianceRate: number;
  estimatedLossesPrevented: number;
  avgResolutionTime: number;
  criticalAlertsCount: number;
}

export function calculateAggregatedMetrics(
  tickets: Array<{
    id: string;
    description: string;
    created_at: string;
    priority: string;
    status: string;
    updated_at?: string;
  }>
): AggregatedMetrics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const completedToday = tickets.filter((t) => {
    if (t.status !== 'completed') return false;
    const updatedAt = new Date(t.updated_at || t.created_at);
    return updatedAt >= todayStart;
  }).length;

  const pendingTickets = tickets.filter((t) => t.status === 'pending').length;

  const slaCompliance = calculateSLACompliance(tickets);

  // Cada ticket completado = $4M / ticketsCount (valor proporcional)
  const potentialLossPerTicket = 4000000 / Math.max(tickets.length, 1);
  const estimatedLossesPrevented = completedToday * potentialLossPerTicket;

  // Calcular tiempo promedio de resolución
  const completedTickets = tickets.filter((t) => t.status === 'completed');
  let avgResolutionTime = 0;
  if (completedTickets.length > 0) {
    const totalHours = completedTickets.reduce((sum, ticket) => {
      const sla = calculateSLA(new Date(ticket.created_at), ticket.priority as any, ticket.status);
      return sum + (sla.timeWindow - sla.hoursRemaining);
    }, 0);
    avgResolutionTime = totalHours / completedTickets.length;
  }

  const criticalAlerts = getCriticalAlerts(tickets);

  return {
    totalTickets: tickets.length,
    completedToday,
    pendingTickets,
    slaComplianceRate: slaCompliance,
    estimatedLossesPrevented,
    avgResolutionTime,
    criticalAlertsCount: criticalAlerts.length,
  };
}

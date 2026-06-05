export type UserRole = "admin" | "tech";

export type TicketStatus = "pending" | "assigned" | "in_progress" | "completed" | "not_completed";
export type TicketPriority = "low" | "medium" | "high";
export type TicketType = "support" | "installation" | "removal";

export const TICKET_TYPE_META: Record<TicketType, { label: string; prefix: string; color: string; bg: string; border: string }> = {
  support:      { label: "Soporte Técnico",  prefix: "ST",  color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" },
  installation: { label: "Instalación",      prefix: "INS", color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  removal:      { label: "Retiro",           prefix: "RT",  color: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
};

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  active: boolean;
  created_at?: string;
}

export interface Ticket {
  id: string;
  ticket_type: TicketType;
  title: string;
  description: string;
  address: string;
  status: TicketStatus;
  priority: TicketPriority;
  scheduled_date: string;
  technician_id: string;
  created_at?: string;
  sla_deadline?: string; // Fecha límite según SLA
  sla_status?: "healthy" | "warning" | "critical"; // Estado del SLA
}

// SLA tiempos en horas según prioridad
export const SLA_HOURS: Record<TicketPriority, number> = {
  high: 2,
  medium: 8,
  low: 24,
};

export interface IncompleteReport {
  id: string;
  ticket_id: string;
  reported_at: string;
  tech_id: string;
  tech_name: string;
  reason: string;
  photo_data: string; // base64 data URL
}

export interface WorkOrder {
  id: string;
  ticket_id: string;
  submitted_at: string;
  // Técnico
  tech_name: string;
  tech_email: string;
  // Cliente
  cliente_nombre: string;
  cliente_local: string;
  cliente_direccion: string;
  cliente_ciudad: string;
  // Incidencia
  problematica: string;
  solucion: string;
  pruebas: string;
  reemplazo_equipo: string;
  retira_equipo: boolean;
  // Supervisor & confirmación
  supervisor_nombre: string;
  recibe_nombre: string;
  recibe_cargo: string;
  rating: number;
  razon_calificacion: string;
}

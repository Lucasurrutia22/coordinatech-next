import clsx from "clsx";
import { TicketPriority, TicketStatus } from "@/types/domain";

const statusLabel: Record<TicketStatus, string> = {
  pending: "Pendiente",
  assigned: "Asignado",
  in_progress: "En progreso",
  completed: "Completado",
  not_completed: "No completado",
};

const priorityLabel: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export function StatusPill({ status }: { status: TicketStatus }) {
  return <span className={clsx("pill", `status-${status}`)}>{statusLabel[status]}</span>;
}

export function PriorityPill({ priority }: { priority: TicketPriority }) {
  return <span className={clsx("pill", `priority-${priority}`)}>{priorityLabel[priority]}</span>;
}

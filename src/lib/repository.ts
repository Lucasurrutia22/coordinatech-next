import { demoTechnicians, demoTickets } from "@/lib/demoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { IncompleteReport, Technician, Ticket, WorkOrder } from "@/types/domain";

const TECHS_KEY = "coordinatech_techs";
const TICKETS_KEY = "coordinatech_tickets";

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function getTechnicians(): Promise<Technician[]> {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as Technician[];
    }
  }

  return loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
}

/** Garantiza que tickets viejos (sin ticket_type) no rompan la UI */
function normalizeTicket(raw: Record<string, unknown>): Ticket {
  return {
    ...raw,
    ticket_type: (raw.ticket_type as Ticket["ticket_type"]) ?? "support",
  } as Ticket;
}

export async function getTickets(): Promise<Ticket[]> {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as Record<string, unknown>[]).map(normalizeTicket);
    }
  }

  return loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
}

export async function createTicket(ticket: Ticket): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.from("tickets").insert([ticket]);
    if (!error) {
      return;
    }
  }

  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  saveLocal(TICKETS_KEY, [ticket, ...current]);
}

export async function updateTicket(id: string, payload: Partial<Ticket>): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.from("tickets").update(payload).eq("id", id);
    if (!error) {
      return;
    }
  }

  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  const updated = current.map((item) => (item.id === id ? { ...item, ...payload } : item));
  saveLocal(TICKETS_KEY, updated);
}

export async function getTicketById(id: string): Promise<Ticket | undefined> {
  const tickets = await getTickets();
  return tickets.find((item) => item.id === id);
}

// ── Work Orders ──────────────────────────────────────────────
export async function getWorkOrders(): Promise<WorkOrder[]> {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (!error && data) return data as WorkOrder[];
  }
  // Fallback localStorage
  return loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
}

export async function createWorkOrder(order: WorkOrder): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.from("work_orders").insert([order]);
    if (!error) return;
  }
  const current = loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
  saveLocal("coordinatech_work_orders", [order, ...current]);
}

// ── Incomplete Reports ────────────────────────────────────────
export async function getIncompleteReports(): Promise<IncompleteReport[]> {
  if (hasSupabaseEnv && supabase) {
    const { data, error } = await supabase
      .from("incomplete_reports")
      .select("*")
      .order("reported_at", { ascending: false });
    if (!error && data) return data as IncompleteReport[];
  }
  return loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
}

export async function createIncompleteReport(report: IncompleteReport): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.from("incomplete_reports").insert([report]);
    if (!error) return;
  }
  const current = loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
  saveLocal("coordinatech_incomplete_reports", [report, ...current]);
}

export async function createTechnician(technician: Technician): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    const { error } = await supabase.from("technicians").insert([technician]);
    if (!error) {
      return;
    }
  }

  const current = loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  saveLocal(TECHS_KEY, [technician, ...current]);
}

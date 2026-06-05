import { demoTechnicians, demoTickets } from "@/lib/demoData";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { enrichTicketWithSLA } from "@/lib/sla";
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
  // Intenta Supabase primero, pero con timeout corto
  if (hasSupabaseEnv && supabase) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .order("created_at", { ascending: false });

      clearTimeout(timeoutId);

      if (!error && data && data.length > 0) {
        saveLocal(TECHS_KEY, data);
        return data as Technician[];
      }
    } catch (err) {
      console.warn("Supabase getTechnicians falló, usando fallback:", err);
    }
  }

  // Fallback: combina localStorage con demoData
  return loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
}

/** Garantiza que tickets viejos (sin ticket_type) no rompan la UI */
function normalizeTicket(raw: Record<string, unknown>): Ticket {
  const ticket = {
    ...raw,
    ticket_type: (raw.ticket_type as Ticket["ticket_type"]) ?? "support",
  } as Ticket;
  return enrichTicketWithSLA(ticket);
}

export async function getTickets(): Promise<Ticket[]> {
  if (hasSupabaseEnv && supabase) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      clearTimeout(timeoutId);

      if (!error && data && data.length > 0) {
        const normalized = (data as Record<string, unknown>[]).map(normalizeTicket);
        saveLocal(TICKETS_KEY, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn("Supabase getTickets falló, usando fallback:", err);
    }
  }

  // Fallback: combina localStorage con demoData enriquecido
  const demo = demoTickets.map(enrichTicketWithSLA);
  return loadLocal<Ticket[]>(TICKETS_KEY, demo);
}

export async function createTicket(ticket: Ticket): Promise<void> {
  const enriched = enrichTicketWithSLA(ticket);

  if (hasSupabaseEnv && supabase) {
    try {
      const { error } = await supabase.from("tickets").insert([enriched]);
      if (!error) {
        return;
      }
    } catch (err) {
      console.warn("Supabase createTicket falló, guardando en localStorage:", err);
    }
  }

  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  saveLocal(TICKETS_KEY, [enriched, ...current]);
}

export async function updateTicket(id: string, payload: Partial<Ticket>): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    try {
      const { error } = await supabase.from("tickets").update(payload).eq("id", id);
      if (!error) {
        return;
      }
    } catch (err) {
      console.warn("Supabase updateTicket falló, actualizando localStorage:", err);
    }
  }

  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  const updated = current.map((item) =>
    item.id === id ? enrichTicketWithSLA({ ...item, ...payload }) : item,
  );
  saveLocal(TICKETS_KEY, updated);
}

export async function getTicketById(id: string): Promise<Ticket | undefined> {
  const tickets = await getTickets();
  return tickets.find((item) => item.id === id);
}

// ── Work Orders ──────────────────────────────────────────────
export async function getWorkOrders(): Promise<WorkOrder[]> {
  if (hasSupabaseEnv && supabase) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .order("submitted_at", { ascending: false });

      clearTimeout(timeoutId);

      if (!error && data) {
        saveLocal("coordinatech_work_orders", data);
        return data as WorkOrder[];
      }
    } catch (err) {
      console.warn("Supabase getWorkOrders falló:", err);
    }
  }
  // Fallback localStorage
  return loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
}

export async function createWorkOrder(order: WorkOrder): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    try {
      const { error } = await supabase.from("work_orders").insert([order]);
      if (!error) return;
    } catch (err) {
      console.warn("Supabase createWorkOrder falló:", err);
    }
  }
  const current = loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
  saveLocal("coordinatech_work_orders", [order, ...current]);
}

// ── Incomplete Reports ────────────────────────────────────────
export async function getIncompleteReports(): Promise<IncompleteReport[]> {
  if (hasSupabaseEnv && supabase) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from("incomplete_reports")
        .select("*")
        .order("reported_at", { ascending: false });

      clearTimeout(timeoutId);

      if (!error && data) {
        saveLocal("coordinatech_incomplete_reports", data);
        return data as IncompleteReport[];
      }
    } catch (err) {
      console.warn("Supabase getIncompleteReports falló:", err);
    }
  }
  return loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
}

export async function createIncompleteReport(report: IncompleteReport): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    try {
      const { error } = await supabase.from("incomplete_reports").insert([report]);
      if (!error) return;
    } catch (err) {
      console.warn("Supabase createIncompleteReport falló:", err);
    }
  }
  const current = loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
  saveLocal("coordinatech_incomplete_reports", [report, ...current]);
}

export async function createTechnician(technician: Technician): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    try {
      const { error } = await supabase.from("technicians").insert([technician]);
      if (!error) {
        return;
      }
    } catch (err) {
      console.warn("Supabase createTechnician falló:", err);
    }
  }

  const current = loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  saveLocal(TECHS_KEY, [technician, ...current]);
}

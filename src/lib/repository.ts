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
  // PRIORIDAD: Intentar obtener de localStorage primero (cambios recientes)
  const localTickets = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  
  // Si tenemos tickets en localStorage y Supabase no está disponible, usar localStorage
  if (!hasSupabaseEnv || !supabase) {
    return localTickets.map(enrichTicketWithSLA);
  }

  // Intentar sincronizar desde Supabase, pero NO sobrescribir localStorage
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    clearTimeout(timeoutId);

    if (!error && data && data.length > 0) {
      // Enriquecer datos de Supabase
      const supabaseTickets = (data as Record<string, unknown>[]).map(normalizeTicket);
      
      // IMPORTANTE: Merging strategy
      // Para cada ticket en Supabase, verificar si hay un cambio reciente en localStorage
      // Si hay cambio reciente en localStorage, mantenerlo (el ticket podría haber sido actualizado localmente)
      const merged = supabaseTickets.map(supTicket => {
        const localTicket = localTickets.find(t => t.id === supTicket.id);
        // Si el ticket existe en localStorage y no es de los datos iniciales, confiar en localStorage
        if (localTicket) {
          return localTicket;
        }
        return supTicket;
      });

      // También agregar tickets que están solo en localStorage (nuevos tickets no sincronizados)
      const allIds = new Set(merged.map(t => t.id));
      localTickets.forEach(localTicket => {
        if (!allIds.has(localTicket.id)) {
          merged.push(localTicket);
        }
      });

      // Guardar la versión mergeada en localStorage
      saveLocal(TICKETS_KEY, merged);
      return merged;
    }
  } catch (err) {
    console.warn("Supabase getTickets falló, usando localStorage:", err);
  }

  // Fallback: usar localStorage
  return localTickets.map(enrichTicketWithSLA);
}

export async function createTicket(ticket: Ticket): Promise<void> {
  const enriched = enrichTicketWithSLA(ticket);

  if (hasSupabaseEnv && supabase) {
    try {
      // Solo guardar campos que existen en la tabla de Supabase
      const { id, ticket_type, title, description, address, status, priority, scheduled_date, technician_id, created_at } = enriched;
      const payload = { id, ticket_type, title, description, address, status, priority, scheduled_date, technician_id, created_at };
      
      const { error } = await supabase.from("tickets").insert([payload]);
      if (error) {
        throw new Error(`Supabase insert error: ${error.message} (${error.code})`);
      }
      return;
    } catch (err) {
      console.warn("Supabase createTicket falló, guardando en localStorage:", err);
    }
  }

  // Fallback a localStorage si Supabase falla
  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  saveLocal(TICKETS_KEY, [enriched, ...current]);
}

export async function updateTicket(id: string, payload: Partial<Ticket>): Promise<void> {
  // IMPORTANTE: Actualizar localStorage PRIMERO para cambio optimista
  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  const updated = current.map((item) =>
    item.id === id ? enrichTicketWithSLA({ ...item, ...payload }) : item,
  );
  saveLocal(TICKETS_KEY, updated);

  // LUEGO intentar Supabase
  if (hasSupabaseEnv && supabase) {
    try {
      // Filtrar solo campos que existen en la tabla de Supabase
      const validFields: (keyof Ticket)[] = ['ticket_type', 'title', 'description', 'address', 'status', 'priority', 'scheduled_date', 'technician_id'];
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Ticket))
      );
      
      const { error } = await supabase.from("tickets").update(filteredPayload).eq("id", id);
      if (error) {
        console.warn("Error updating ticket in Supabase:", error);
      }
    } catch (err) {
      console.warn("Supabase updateTicket falló:", err);
      // Ya está actualizado en localStorage, no hay nada más que hacer
    }
  }
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

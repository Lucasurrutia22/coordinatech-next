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
  // PRIORIDAD: SIEMPRE retornar localStorage como fuente de verdad
  // localStorage es el source-of-truth para datos locales
  const localTickets = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  
  console.log("🔧 DEBUG getTickets(): Cargado localTickets con", localTickets.length, "tickets");
  const st008 = localTickets.find(t => t.id === 'ST-008');
  if (st008) console.log("🔧 DEBUG getTickets(): ST-008 status en localStorage =", st008.status);
  
  // Si tenemos tickets en localStorage y Supabase no está disponible, usar localStorage
  if (!hasSupabaseEnv || !supabase) {
    return localTickets.map(enrichTicketWithSLA);
  }

  // Intentar sincronizar desde Supabase EN BACKGROUND, pero NO devolver datos de Supabase
  // Esto asegura que los cambios locales NO se pierdan
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
      
      console.log("🔧 DEBUG getTickets(): Cargado de Supabase", supabaseTickets.length, "tickets");
      const st008sup = supabaseTickets.find(t => t.id === 'ST-008');
      if (st008sup) console.log("🔧 DEBUG getTickets(): ST-008 status en Supabase =", st008sup.status);
      
      // IMPORTANTE: Solo actualizar localStorage si hay tickets NEW en Supabase
      // (nunca sobrescribir cambios locales)
      const merged: Ticket[] = [];
      const localIdSet = new Set(localTickets.map(t => t.id));
      
      // Agregar todos los tickets locales (preservando cambios locales)
      merged.push(...localTickets);
      
      // Agregar tickets que son nuevos en Supabase (no están en localStorage)
      supabaseTickets.forEach(supTicket => {
        if (!localIdSet.has(supTicket.id)) {
          merged.push(supTicket);
        }
      });

      console.log("🔧 DEBUG getTickets(): Merged tiene", merged.length, "tickets");
      
      // Solo actualizar localStorage si hay tickets nuevos
      const hasMergeChanges = merged.length !== localTickets.length;
      if (hasMergeChanges) {
        console.log("🔧 DEBUG getTickets(): Actualizando localStorage con tickets nuevos de Supabase");
        saveLocal(TICKETS_KEY, merged);
      } else {
        console.log("🔧 DEBUG getTickets(): NO actualizando localStorage (sin cambios)");
      }
      
      return merged.map(enrichTicketWithSLA);
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
  // CRÍTICO: Actualizar localStorage PRIMERO y SINCRÓNICAMENTE
  // Esto es NON-NEGOTIABLE para cambios optimistas
  const current = loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  
  // Verificar que el ticket existe
  const ticketIndex = current.findIndex(item => item.id === id);
  if (ticketIndex === -1) {
    throw new Error(`Ticket ${id} not found in localStorage`);
  }
  
  // Actualizar el ticket
  const updated = current.map((item) =>
    item.id === id ? enrichTicketWithSLA({ ...item, ...payload }) : item,
  );
  
  // GUARDAR INMEDIATAMENTE en localStorage
  saveLocal(TICKETS_KEY, updated);
  console.log(`updateTicket: Actualizado ${id} en localStorage, status=${payload.status}`);

  // LUEGO intentar Supabase (sin bloquear)
  if (hasSupabaseEnv && supabase) {
    try {
      // Filtrar solo campos que existen en la tabla de Supabase
      const validFields: (keyof Ticket)[] = ['ticket_type', 'title', 'description', 'address', 'status', 'priority', 'scheduled_date', 'technician_id'];
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Ticket))
      );
      
      const { error } = await supabase.from("tickets").update(filteredPayload).eq("id", id);
      if (error) {
        console.warn(`updateTicket: Supabase fallo para ${id}:`, error);
        // NO relanzar el error aquí - los cambios ya están en localStorage
      } else {
        console.log(`updateTicket: ${id} actualizado exitosamente en Supabase`);
      }
    } catch (err) {
      console.warn(`updateTicket: Excepcion de Supabase para ${id}:`, err);
      // NO relanzar - localStorage ya está actualizado
    }
  }
  // NO hay que relanzar errores aquí - localStorage está garantizado que se actualizó
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

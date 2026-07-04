import { demoTechnicians, demoTickets } from "@/lib/demoData";
import { getStoredJSON, setStoredJSON } from "@/lib/storage";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { enrichTicketWithSLA } from "@/lib/sla";
import { IncompleteReport, Technician, Ticket, WorkOrder } from "@/types/domain";

const TECHS_KEY = "coordinatech_techs";
const TICKETS_KEY = "coordinatech_tickets";

async function loadLocal<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = await getStoredJSON<T>(key);
  if (stored !== null) {
    return stored;
  }

  await setStoredJSON(key, fallback);
  return fallback;
}

async function saveLocal<T>(key: string, value: T): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await setStoredJSON(key, value);
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
        await saveLocal(TECHS_KEY, data);
        return data as Technician[];
      }
    } catch (err) {
      console.warn("Supabase getTechnicians falló, usando fallback:", err);
    }
  }

  // Fallback: combina almacenamiento local con demoData
  return await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
}

/** Garantiza que tickets viejos (sin ticket_type) no rompan la UI */
function normalizeTicket(raw: Record<string, unknown>): Ticket {
  const ticket = {
    ...raw,
    ticket_type: (raw.ticket_type as Ticket["ticket_type"]) ?? "support",
  } as Ticket;
  return enrichTicketWithSLA(ticket);
}

function normalizeText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function getTicketSemanticKey(ticket: Ticket): string {
  return [
    ticket.ticket_type,
    normalizeText(ticket.title),
    normalizeText(ticket.description),
    normalizeText(ticket.address),
    ticket.priority,
    normalizeText(ticket.technician_id),
    ticket.scheduled_date ? new Date(ticket.scheduled_date).toISOString() : "",
  ].join("|");
}

function scoreTicketCompleteness(ticket: Ticket): number {
  return [
    ticket.id,
    ticket.title,
    ticket.description,
    ticket.address,
    ticket.created_at,
    ticket.scheduled_date,
    ticket.technician_id,
    ticket.client_name,
  ].filter(Boolean).length;
}

function dedupeTickets(tickets: Ticket[]): Ticket[] {
  const byId = new Map<string, Ticket>();

  for (const ticket of tickets) {
    const existing = byId.get(ticket.id);
    if (!existing || scoreTicketCompleteness(ticket) >= scoreTicketCompleteness(existing)) {
      byId.set(ticket.id, ticket);
    }
  }

  const bySemanticKey = new Map<string, Ticket>();

  for (const ticket of byId.values()) {
    const key = getTicketSemanticKey(ticket);
    const existing = bySemanticKey.get(key);
    if (!existing || scoreTicketCompleteness(ticket) >= scoreTicketCompleteness(existing)) {
      bySemanticKey.set(key, ticket);
    }
  }

  return Array.from(bySemanticKey.values()).sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

export async function getTickets(): Promise<Ticket[]> {
  // Prioridad: retornar almacenamiento local como fuente de verdad.
  const localTickets = await loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);

  // Si tenemos tickets en almacenamiento local y Supabase no esta disponible, usar almacenamiento local.
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

      // Importante: solo actualizar almacenamiento local si hay tickets nuevos en Supabase.
      // (nunca sobrescribir cambios locales)
      const merged: Ticket[] = [];
      const localIdSet = new Set(localTickets.map(t => t.id));
      
      // Agregar todos los tickets locales (preservando cambios locales)
      merged.push(...localTickets);
      
      // Agregar tickets que son nuevos en Supabase (no estan en almacenamiento local)
      supabaseTickets.forEach(supTicket => {
        if (!localIdSet.has(supTicket.id)) {
          merged.push(supTicket);
        }
      });

      const deduped = dedupeTickets(merged);

      // Solo actualizar almacenamiento local si hay tickets nuevos.
      const hasMergeChanges = JSON.stringify(deduped) !== JSON.stringify(localTickets);
      if (hasMergeChanges) {
        await saveLocal(TICKETS_KEY, deduped);
      }

      return deduped.map(enrichTicketWithSLA);
    }
  } catch (err) {
    console.warn("Supabase getTickets fallo, usando almacenamiento local:", err);
  }

  // Fallback: usar almacenamiento local.
  return dedupeTickets(localTickets).map(enrichTicketWithSLA);
}

export async function createTicket(ticket: Ticket): Promise<void> {
  const enriched = enrichTicketWithSLA(ticket);
  const current = await loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  const existsLocally = current.some((item) => item.id === enriched.id);

  if (!existsLocally) {
    await saveLocal(TICKETS_KEY, [enriched, ...current]);
  }

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
      console.warn("Supabase createTicket fallo, guardando en almacenamiento local:", err);
    }
  }
}

export async function updateTicket(id: string, payload: Partial<Ticket>): Promise<void> {
  // Critico: actualizar almacenamiento local primero.
  // Esto es NON-NEGOTIABLE para cambios optimistas
  const current = await loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);
  
  // Verificar que el ticket existe
  const ticketIndex = current.findIndex(item => item.id === id);
  if (ticketIndex === -1) {
    throw new Error(`Ticket ${id} not found in local storage`);
  }
  
  // Actualizar el ticket
  const updated = current.map((item) =>
    item.id === id ? enrichTicketWithSLA({ ...item, ...payload }) : item,
  );
  
  // Guardar inmediatamente en almacenamiento local.
  await saveLocal(TICKETS_KEY, updated);

  // LUEGO intentar Supabase (sin bloquear)
  if (hasSupabaseEnv && supabase) {
    try {
      // Filtrar solo campos que existen en la tabla de Supabase
      const validFields: (keyof Ticket)[] = ['ticket_type', 'title', 'description', 'address', 'status', 'priority', 'scheduled_date', 'technician_id', 'is_archived'];
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Ticket))
      );
      
      const { error } = await supabase.from("tickets").update(filteredPayload).eq("id", id);
      if (error) {
        console.warn(`updateTicket: Supabase fallo para ${id}:`, error);
        // No relanzar el error aqui: los cambios ya estan en almacenamiento local.
      }
    } catch (err) {
      console.warn(`updateTicket: Excepcion de Supabase para ${id}:`, err);
      // No relanzar: almacenamiento local ya esta actualizado.
    }
  }
  // No relanzar errores aqui: almacenamiento local ya se actualizo.
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
        await saveLocal("coordinatech_work_orders", data);
        return data as WorkOrder[];
      }
    } catch (err) {
      console.warn("Supabase getWorkOrders falló:", err);
    }
  }
  return await loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
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
  const current = await loadLocal<WorkOrder[]>("coordinatech_work_orders", []);
  await saveLocal("coordinatech_work_orders", [order, ...current]);
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
        await saveLocal("coordinatech_incomplete_reports", data);
        return data as IncompleteReport[];
      }
    } catch (err) {
      console.warn("Supabase getIncompleteReports falló:", err);
    }
  }
  return await loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
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
  const current = await loadLocal<IncompleteReport[]>("coordinatech_incomplete_reports", []);
  await saveLocal("coordinatech_incomplete_reports", [report, ...current]);
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

  const current = await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  await saveLocal(TECHS_KEY, [technician, ...current]);
}

export async function updateTechnician(id: string, payload: Partial<Technician>): Promise<void> {
  // Igual que updateTicket: el almacenamiento local se actualiza primero y siempre.
  const current = await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  const updated = current.map((item) => (item.id === id ? { ...item, ...payload } : item));
  await saveLocal(TECHS_KEY, updated);

  if (hasSupabaseEnv && supabase) {
    try {
      const validFields: (keyof Technician)[] = ["name", "email", "phone", "password", "active"];
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Technician)),
      );

      const { error } = await supabase.from("technicians").update(filteredPayload).eq("id", id);
      if (error) {
        console.warn(`updateTechnician: Supabase falló para ${id}:`, error);
        // No relanzar: el almacenamiento local ya está actualizado.
      }
    } catch (err) {
      console.warn(`updateTechnician: excepción de Supabase para ${id}:`, err);
    }
  }
}

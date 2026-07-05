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

      // Supabase respondió correctamente — es la fuente de verdad, incluso si
      // devuelve 0 filas (technicians recién configurado y aún sin datos).
      // Antes se exigía data.length > 0, así que una tabla vacía caía al
      // fallback de demoData ("TECH-001"... etc.), mostrando técnicos que no
      // existen en Supabase — cualquier ticket asignado a esos IDs fantasma
      // violaba la FK de tickets.technician_id al guardarse.
      if (!error && data) {
        await saveLocal(TECHS_KEY, data);
        return data as Technician[];
      }
    } catch (err) {
      console.warn("Supabase getTechnicians falló, usando fallback:", err);
    }
  }

  // Fallback: combina almacenamiento local con demoData
  // (solo cuando Supabase no está configurado o es inalcanzable)
  return await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
}

/** Garantiza que tickets viejos (sin ticket_type) no rompan la UI */
function normalizeTicket(raw: Record<string, unknown>): Ticket {
  const ticket = {
    ...raw,
    ticket_type: (raw.ticket_type as Ticket["ticket_type"]) ?? "support",
    // Supabase guarda "sin asignar" como NULL (por la FK a technicians.id); el resto
    // de la app siempre compara technician_id como string ("" = sin asignar).
    technician_id: (raw.technician_id as string | null) ?? "",
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
  const localTickets = await loadLocal<Ticket[]>(TICKETS_KEY, demoTickets);

  // Si Supabase no esta configurado/disponible, el almacenamiento local es lo unico que hay.
  if (!hasSupabaseEnv || !supabase) {
    return localTickets.map(enrichTicketWithSLA);
  }

  // Supabase es la fuente de verdad cuando esta disponible; ver el comentario
  // mas abajo sobre por que ya no se prefiere el local para tickets conocidos.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false });

    clearTimeout(timeoutId);

    if (!error && data) {
      // Enriquecer datos de Supabase
      const supabaseTickets = (data as Record<string, unknown>[]).map(normalizeTicket);

      // Supabase es la fuente de verdad para cualquier ticket que ya sincronizó allá:
      // cualquier cambio de estado real (iniciar, aceptar, completar, etc.) pasa por
      // la API route y escribe directo a Supabase, nunca al IndexedDB del navegador
      // que hizo la request — así que preferir el local para un ticket ya existente
      // hacía que el cambio recién guardado se viera "revertido" en la UI apenas
      // se llamaba a refreshData(). El local solo aporta tickets creados offline
      // que Supabase todavía no tiene (aún no sincronizados).
      const merged: Ticket[] = [];
      const supabaseIdSet = new Set(supabaseTickets.map(t => t.id));

      merged.push(...supabaseTickets);

      localTickets.forEach(localTicket => {
        if (!supabaseIdSet.has(localTicket.id)) {
          merged.push(localTicket);
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
    let response: { error: { code?: string; message: string } | null } | undefined;
    try {
      // Solo guardar campos que existen en la tabla de Supabase
      const { id, ticket_type, title, description, address, status, priority, scheduled_date, technician_id, created_at } = enriched;
      const payload = {
        id, ticket_type, title, description, address, status, priority, scheduled_date, created_at,
        // technician_id es FK a technicians(id): "" (sin asignar) NO matchea NULL para
        // Postgres y viola la constraint — hay que normalizarlo antes de enviarlo.
        technician_id: technician_id || null,
      };

      response = await supabase.from("tickets").insert([payload]);
    } catch (networkErr) {
      console.warn("Supabase createTicket inalcanzable, el ticket queda solo en almacenamiento local:", networkErr);
    }

    if (response) {
      if (!response.error) return;
      // Supabase respondió con un rechazo real (no una falla de red) — no debe
      // quedar solo en local, porque nunca llegaría a sincronizar y sería invisible
      // para cualquier otro dispositivo/sesión (ej. el técnico asignado).
      throw new Error(response.error.message || "No se pudo crear el ticket en Supabase.");
    }
  }
}

export async function updateTicket(id: string, payload: Partial<Ticket>): Promise<void> {
  // Esta función corre tanto en el navegador (fallback de editTicketHandler)
  // como en el servidor (la API route PATCH /api/tickets/[id]). El almacenamiento
  // local (IndexedDB) solo existe en el navegador — loadLocal() lo detecta y
  // devuelve demoTickets como si fuera el real, así que en el servidor CUALQUIER
  // ticket real (no-demo) "no se encontraba" y la función lanzaba error antes de
  // siquiera intentar escribir en Supabase, bloqueando todo cambio de estado que
  // pasara por la API (iniciar, aceptar, rechazar, reasignar, no completado).
  if (typeof window !== "undefined") {
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
  }

  // LUEGO intentar Supabase (sin bloquear)
  if (hasSupabaseEnv && supabase) {
    let response: { error: { code?: string; message: string } | null } | undefined;
    try {
      // Filtrar solo campos que existen en la tabla de Supabase
      const validFields: (keyof Ticket)[] = ['ticket_type', 'title', 'description', 'address', 'status', 'priority', 'scheduled_date', 'technician_id', 'is_archived'];
      const filteredPayload: Record<string, unknown> = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Ticket))
      );
      // Mismo problema de FK que en createTicket: "" no matchea NULL.
      if ('technician_id' in filteredPayload && !filteredPayload.technician_id) {
        filteredPayload.technician_id = null;
      }

      response = await supabase.from("tickets").update(filteredPayload).eq("id", id);
    } catch (networkErr) {
      console.warn(`updateTicket: Supabase inalcanzable para ${id}, el cambio queda solo en almacenamiento local:`, networkErr);
    }

    if (response && response.error) {
      // Rechazo real de Supabase (no falla de red) — el almacenamiento local ya
      // tiene el cambio optimista, pero hay que avisar para que el llamador (API
      // route o el fallback del cliente) revierta y refresque en vez de asumir éxito.
      throw new Error(response.error.message || `No se pudo actualizar el ticket ${id} en Supabase.`);
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
    let response: { error: { code?: string; message: string } | null } | undefined;
    try {
      response = await supabase.from("technicians").insert([technician]);
    } catch (networkErr) {
      console.warn("Supabase createTechnician inalcanzable, usando almacenamiento local:", networkErr);
    }

    if (response) {
      if (!response.error) return;
      // Supabase respondió: es un rechazo real (ej. email duplicado por el constraint
      // unique de la tabla), no una falla de red — no debe guardarse en local como si
      // hubiera funcionado, o el técnico "creado" desaparecería en el próximo refresh.
      if (response.error.code === "23505") {
        throw new Error("Ya existe un técnico con este correo electrónico.");
      }
      throw new Error(response.error.message || "No se pudo crear el técnico.");
    }
  }

  const current = await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  await saveLocal(TECHS_KEY, [technician, ...current]);
}

export async function updateTechnician(id: string, payload: Partial<Technician>): Promise<void> {
  if (hasSupabaseEnv && supabase) {
    let response: { error: { code?: string; message: string } | null } | undefined;
    try {
      const validFields: (keyof Technician)[] = ["name", "email", "phone", "password", "active"];
      const filteredPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => validFields.includes(key as keyof Technician)),
      );
      response = await supabase.from("technicians").update(filteredPayload).eq("id", id);
    } catch (networkErr) {
      console.warn(`updateTechnician: Supabase inalcanzable para ${id}, usando almacenamiento local:`, networkErr);
    }

    if (response) {
      if (!response.error) {
        const current = await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
        await saveLocal(TECHS_KEY, current.map((item) => (item.id === id ? { ...item, ...payload } : item)));
        return;
      }
      // Rechazo real de Supabase (ej. email duplicado) — no lo escondemos guardando
      // local igual, porque el próximo refresh traería de vuelta el dato viejo y el
      // admin nunca se enteraría de que el cambio no se aplicó.
      if (response.error.code === "23505") {
        throw new Error("Ya existe un técnico con este correo electrónico.");
      }
      throw new Error(response.error.message || "No se pudo actualizar el técnico.");
    }
  }

  // Solo llega aquí si Supabase no está configurado o es inalcanzable (offline).
  const current = await loadLocal<Technician[]>(TECHS_KEY, demoTechnicians);
  const updated = current.map((item) => (item.id === id ? { ...item, ...payload } : item));
  await saveLocal(TECHS_KEY, updated);
}

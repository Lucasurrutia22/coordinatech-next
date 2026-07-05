import { NextRequest, NextResponse } from "next/server";
import { getTicketById, updateTicket } from "@/lib/repository";

const validStates = ["pending", "assigned", "in_progress", "completed", "not_completed"];

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Validar transiciones de estado permitidas
 * Valid transitions:
 * - pending → assigned (técnico acepta)
 * - pending → in_progress (técnico comienza trabajo)
 * - in_progress → completed (técnico completa con orden de trabajo)
 * - in_progress → not_completed (técnico no puede completar)
 * - pending/assigned → pending (admin reasigna)
 */
function isValidStateTransition(currentStatus: string, newStatus: string): boolean {
  if (!validStates.includes(newStatus)) {
    return false;
  }

  // Reenviar el mismo status es un no-op idempotente: puede llegar por doble
  // clic o una reconexión que reintenta una request que ya se aplicó. No es
  // un cambio de estado real, así que no debe rechazarse como transición inválida.
  if (currentStatus === newStatus) {
    return true;
  }

  // Las transiciones más comunes
  const allowedTransitions: Record<string, string[]> = {
    pending: ["assigned", "in_progress", "pending"], // reasignación
    assigned: ["in_progress", "pending"],
    in_progress: ["completed", "not_completed"],
    completed: [], // Terminal state
    not_completed: ["pending"], // Vuelve a cola de admin
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * PATCH /api/tickets/[id]
 * Actualiza un ticket con validación de transiciones
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();

    // Validación básica del payload
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const currentTicket = await getTicketById(ticketId);
    if (!currentTicket) {
      return NextResponse.json(
        { error: `Ticket not found: ${ticketId}` },
        { status: 404 }
      );
    }

    // Si se intenta cambiar status, validar transición real
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !validStates.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Invalid status: ${String(body.status)}. Must be one of: ${validStates.join(", ")}`
          },
          { status: 400 }
        );
      }

      if (!isValidStateTransition(currentTicket.status, body.status)) {
        return NextResponse.json(
          {
            error: `Invalid state transition: ${currentTicket.status} -> ${body.status}`,
          },
          { status: 409 }
        );
      }
    }

    // Validaciones adicionales
    const allowedFields = [
      "status",
      "technician_id",
      "priority",
      "scheduled_date",
      "description",
      "work_order_id",
      "is_archived",
    ];
    
    for (const key of Object.keys(body)) {
      if (!allowedFields.includes(key)) {
        return NextResponse.json(
          { error: `Field not allowed: ${key}` },
          { status: 400 }
        );
      }
    }

    // Llamar a la función de repositorio
    await updateTicket(ticketId, body);

    return NextResponse.json(
      { success: true, message: "Ticket updated successfully", ticketId },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/tickets/[id]]:", error);
    return NextResponse.json(
      { 
        error: "Failed to update ticket",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets/[id]
 * Obtiene un ticket específico (opcional, para validaciones futuras)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }

    const { id: ticketId } = await params;

    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: `Ticket not found: ${ticketId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, ticket },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/tickets/[id]]:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

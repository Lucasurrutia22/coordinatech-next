import { NextRequest, NextResponse } from "next/server";
import { updateTicket } from "@/lib/repository";

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
  // Estados válidos
  const validStates = ["pending", "assigned", "in_progress", "completed", "not_completed"];
  
  if (!validStates.includes(newStatus)) {
    return false;
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
    const { id: ticketId } = await params;
    const body = await request.json();

    // Validación básica del payload
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Si se intenta cambiar status, validar transición
    if (body.status !== undefined) {
      // Aquí en una app real, obtendríamos el ticket actual de Supabase
      // Para esta versión, confiamos en que el cliente sabe el estado actual
      // En producción, deberías hacer:
      // const currentTicket = await supabase.from('tickets').select('status').eq('id', ticketId).single();
      // if (!isValidStateTransition(currentTicket.status, body.status)) { ... }
      
      // Por ahora, validamos solo que sea un estado válido
      const validStates = ["pending", "assigned", "in_progress", "completed", "not_completed"];
      if (!validStates.includes(body.status)) {
        return NextResponse.json(
          { 
            error: `Invalid status: ${body.status}. Must be one of: ${validStates.join(", ")}` 
          },
          { status: 400 }
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
    const { id: ticketId } = await params;
    
    // En una app real, traerías desde Supabase:
    // const { data, error } = await supabase
    //   .from("tickets")
    //   .select("*")
    //   .eq("id", ticketId)
    //   .single();
    
    return NextResponse.json(
      { message: "GET endpoint for tickets not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[GET /api/tickets/[id]]:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}

CONTEXTO DEL PROYECTO:
App Next.js (App Router) de gestión de tickets, con roles "admin" y "tech".
Estado del ticket: src/types/domain.ts → TicketStatus = "pending" | "assigned" |
"in_progress" | "completed" | "not_completed".
Estado global de datos: src/context/AppContext.tsx (tickets, editTicket, getVisibleTickets,
getAvailableTickets). Persistencia: src/lib/repository.ts (updateTicket, getTickets).

BUG PRINCIPAL — Detectado y confirmado en el código:

1. src/app/(protected)/tickets/[id]/orden-soporte/page.tsx → función handleSubmit()
   (~línea 238): al enviar la Orden de Soporte, solo llama a addWorkOrder(orderData).
   NUNCA actualiza el ticket. Hay que agregar una llamada a editTicket(ticket.id,
   { status: "completed" }) antes o junto con addWorkOrder, para que el ticket quede
   marcado como completado apenas se envía la OT.

2. src/context/AppContext.tsx → getVisibleTickets() (~línea 249): el filtro para el rol
   "tech" es `tickets.filter(t => t.technician_id === user.id)`, sin excluir estados
   cerrados. Hay que separar la bandeja en dos grupos:
     - Tickets ACTIVOS del técnico: technician_id === user.id AND status NOT IN
       ("completed", "not_completed")
     - Historial de tickets CERRADOS del técnico: technician_id === user.id (o un campo
       de "último técnico" si decides limpiar technician_id al completar) AND status IN
       ("completed", "not_completed")
   La bandeja principal ("Mis Tickets Asignados") debe mostrar solo los activos. Los
   cerrados deben desaparecer de ahí y pasar a una sección/tab "Historial" o
   "Completados" separada (no eliminar el registro, solo sacarlo de la vista activa).

3. src/context/AppContext.tsx → getAvailableTickets() (~línea 256): el filtro
   `!t.technician_id || t.technician_id === ""` no excluye status "not_completed".
   Agregar condición para que SOLO se consideren "disponibles para autoasignación" los
   tickets con status "pending" (o "assigned" sin técnico). Los tickets en estado
   "not_completed" NO deben aparecer en esta lista pública: deben quedar visibles
   ÚNICAMENTE en el panel de administrador para reasignación manual.

4. src/components/WorkTimer.tsx + src/lib/timeTracking.ts → función completeWorkTimer()
   (~línea 157-190): tiene un modal de finalización redundante y con lógica distinta a
   los botones "No completado" / "Completar Orden de Soporte" de
   tickets/[id]/page.tsx. Corregir así:
     a) Eliminar (o desactivar) el modal de finalización del WorkTimer
        (showCompletionModal y sus opciones "work_order"/"not_completed"). El cronómetro
        debe limitarse a iniciar/pausar/reanudar el trabajo, NO a cerrar el ticket.
        Cerrar el ticket debe hacerse SIEMPRE desde los dos botones ya existentes en
        tickets/[id]/page.tsx ("No completado" y "Completar Orden de Soporte"), que son
        el único flujo válido.
     b) Si por alguna razón se decide mantener completeWorkTimer() para otro propósito
        (ej. solo registrar tiempos), su parámetro completionType NO debe tocar el
        status del ticket ni el technician_id — eso debe quedar exclusivamente a cargo
        de editTicket() desde la página del ticket, para tener una sola fuente de verdad.

COMPORTAMIENTO ESPERADO FINAL:

- Técnico cierra como "Completado / OT realizada":
  → status pasa a "completed".
  → el ticket desaparece de "Mis Tickets Asignados" (activos) inmediatamente, sin
    recargar manualmente.
  → queda visible en un historial de tickets completados (técnico y admin).

- Técnico cierra como "No completado / No disponible":
  → status pasa a "not_completed", technician_id se limpia (ya funciona en
    handleSubmitNC, en tickets/[id]/page.tsx ~línea 134 — usar esa misma función como
    única referencia, no la del WorkTimer).
  → el ticket desaparece de la bandeja del técnico.
  → el ticket NO aparece en "Tickets Disponibles para Aceptar" de otros técnicos.
  → el ticket aparece en el panel de administrador (ya existe el panel condicional
    `ticket.status === "not_completed"` en tickets/[id]/page.tsx ~línea 419) con el
    botón "Reasignar ticket".
  → al reasignar, el ticket vuelve a "pending"/"assigned" con un nuevo technician_id,
    y reaparece en la bandeja del técnico nuevo.

ANTES DE TOCAR CÓDIGO: explicame qué archivos vas a modificar y por qué, y avisame si
detectás algún otro lugar del código que también actualice el status del ticket fuera
de los que te mencioné, para no dejar una tercera fuente de verdad inconsistente.

MEJORAS OPCIONALES (proponelas, no las apliques sin confirmar):
- Agregar un selector de técnico directo en el botón "Reasignar ticket" del admin, en
  vez de dejarlo en "pending" sin asignar.
- Toast/spinner de confirmación al cerrar un ticket (completado o no completado).
- Registro de historial de cambios de estado por ticket (quién, cuándo, motivo).
- Unificar visualmente el botón de completar del WorkTimer con el de
  "Completar Orden de Soporte" para que no parezcan dos acciones distintas.
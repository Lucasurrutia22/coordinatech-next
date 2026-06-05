"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { TicketPriority, TicketStatus } from "@/types/domain";

export default function EditTicketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tickets, editTicket, technicians, user } = useAppContext();

  if (user?.role === "tech") {
    router.replace("/tickets");
    return null;
  }

  const ticket = useMemo(() => tickets.find((item) => item.id === id), [tickets, id]);

  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "pending");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority ?? "medium");
  const [technicianId, setTechnicianId] = useState(ticket?.technician_id ?? "");

  if (!ticket) {
    return <section className="panel">Ticket no encontrado.</section>;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await editTicket(ticket.id, {
      status,
      priority,
      technician_id: technicianId,
    });
    router.push(`/tickets/${ticket.id}`);
  };

  return (
    <section className="panel">
      <h2>Editar ticket</h2>
      <form onSubmit={submit} className="form-grid compact">
        <label>
          Estado
          <select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}>
            <option value="pending">Pendiente</option>
            <option value="assigned">Asignado</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Completado</option>
          </select>
        </label>
        <label>
          Prioridad
          <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label>
          Tecnico
          <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </label>
        <div className="row-end full">
          <button type="submit" className="primary-btn">
            Actualizar
          </button>
        </div>
      </form>
    </section>
  );
}

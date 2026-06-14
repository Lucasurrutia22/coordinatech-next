"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { TICKET_TYPE_META, TicketPriority, TicketType } from "@/types/domain";

export default function NewTicketPage() {
  const { technicians, tickets, addTicket, user } = useAppContext();
  const router = useRouter();

  if (user?.role === "tech") {
    router.replace("/tickets");
    return null;
  }

  const defaultTech = useMemo(() => technicians[0]?.id ?? "", [technicians]);

  const [ticketType, setTicketType] = useState<TicketType>("support");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 16));
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [technicianId, setTechnicianId] = useState(""); // Vacío = sin asignar

  // Preview del ID correlativo
  const previewId = useMemo(() => {
    const meta   = TICKET_TYPE_META[ticketType];
    const prefix = meta.prefix;
    const count  = tickets.filter((t) => t.id.startsWith(prefix + "-")).length;
    return `${prefix}-${String(count + 1).padStart(3, "0")}`;
  }, [ticketType, tickets]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addTicket({
      ticket_type: ticketType,
      title,
      description,
      address,
      status: technicianId ? "assigned" : "pending", // Cambiar a "assigned" si hay técnico
      priority,
      scheduled_date: new Date(scheduledDate).toISOString(),
      technician_id: technicianId, // Puede ser vacío
    });
    router.push("/tickets");
  };

  const typeMeta = TICKET_TYPE_META[ticketType];

  return (
    <section className="panel">
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Nuevo ticket</h2>
        <p className="muted" style={{ fontSize: "0.82rem" }}>El ID se asigna automáticamente según el tipo de solicitud.</p>
      </div>

      <form onSubmit={submit} className="form-grid">

        {/* Tipo de solicitud */}
        <label className="full">
          Tipo de solicitud
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
            {(Object.entries(TICKET_TYPE_META) as [TicketType, typeof TICKET_TYPE_META[TicketType]][]).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTicketType(key)}
                style={{
                  flex: 1, minWidth: 110,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--r-sm)",
                  border: `2px solid ${ticketType === key ? meta.color : "var(--line)"}`,
                  background: ticketType === key ? meta.bg : "var(--surface)",
                  color: ticketType === key ? meta.color : "var(--muted)",
                  fontWeight: ticketType === key ? 700 : 400,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.05em" }}>{meta.prefix}</div>
                <div style={{ fontSize: "0.74rem", marginTop: 2 }}>{meta.label}</div>
              </button>
            ))}
          </div>
        </label>

        {/* Preview del ID */}
        <div className="full" style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          padding: "0.6rem 0.9rem",
          background: typeMeta.bg,
          border: `1px solid ${typeMeta.border}`,
          borderRadius: "var(--r-sm)",
          fontSize: "0.84rem",
        }}>
          <span style={{ color: "var(--muted)" }}>ID asignado:</span>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: typeMeta.color, letterSpacing: "0.04em" }}>
            {previewId}
          </span>
          <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>— {typeMeta.label}</span>
        </div>

        <label>
          Titulo
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label>
          Direccion
          <input value={address} onChange={(event) => setAddress(event.target.value)} required />
        </label>
        <label className="full">
          Descripcion
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
        </label>
        <label>
          Fecha y hora
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            required
          />
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
          Tecnico (Opcional)
          <select
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
          >
            <option value="">📋 Sin asignar (disponible para aceptar)</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
        </label>
        <div className="full row-end">
          <button type="submit" className="primary-btn">
            Guardar ticket
          </button>
        </div>
      </form>
    </section>
  );
}

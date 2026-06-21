"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader, Send } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";

const ZOHO_BASE_URL =
  "https://forms.zohopublic.com/lucasurrutiaagm1/form/FormulariodeOrdendeSoporteenTerreno/formperma/kMm5kCLYqRM8FWN2jhRU-paPESv0711Ff59ftqHtwok";

// Función para construir URL de Zoho con campos pre-rellenados
function buildZohoUrlWithPrefill(
  techName: string,
  techEmail: string,
  ticketId: string,
  address: string,
  clientName?: string,
  clientLocal?: string
): string {
  // Parámetros para pre-llenar campos en Zoho
  // Los nombres de campo se basan en la estructura del formulario
  const params = new URLSearchParams();
  
  // Datos del Técnico
  params.append("Name_First", techName.split(" ")[0]); // Primer nombre
  params.append("Name_Last", techName.split(" ").slice(1).join(" ")); // Resto del nombre
  params.append("Email", techEmail);
  
  // Código de Solicitud (Ticket ID)
  params.append("SingleLine", ticketId);
  
  // Datos del Cliente (opcionales, si el usuario los ingresó)
  if (clientName) params.append("SingleLine1", clientName);
  if (clientLocal) params.append("SingleLine2", clientLocal);
  
  // Dirección
  params.append("SingleLine3", address);
  
  // Construir URL final
  return `${ZOHO_BASE_URL}?${params.toString()}`;
}

export default function OrdenSoportePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tickets, user, addWorkOrder, editTicket } = useAppContext();

  const ticket = tickets.find((t) => t.id === id);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!ticket) {
    return <section className="panel">Ticket no encontrado.</section>;
  }

  if (user?.role !== "tech" || user.id !== ticket.technician_id) {
    return (
      <section className="panel" style={{ textAlign: "center", padding: "3rem" }}>
        <p style={{ color: "var(--muted)" }}>No tienes permiso para completar esta orden.</p>
        <Link href={`/tickets/${id}`} className="outline-btn" style={{ marginTop: "1rem", display: "inline-flex" }}>
          Volver al ticket
        </Link>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // Preparar datos de la orden con TODOS los campos requeridos
      const orderData = {
        ticket_id: ticket.id,
        tech_name: user.name,
        tech_email: user.email,
        cliente_nombre: (formData.get("cliente_nombre") as string) || "N/A",
        cliente_local: (formData.get("cliente_local") as string) || "N/A",
        cliente_direccion: ticket.address,
        cliente_ciudad: "N/A",
        problematica: ticket.description,
        solucion: (formData.get("solucion") as string) || "Completado",
        pruebas: "Completadas en terreno",
        reemplazo_equipo: "No",
        retira_equipo: false,
        supervisor_nombre: "Sistema",
        recibe_nombre: "Cliente",
        recibe_cargo: "Responsable",
        rating: 5,
        razon_calificacion: "Trabajo completado exitosamente",
      };

      // PASO 1: Guardar orden de trabajo en contexto
      await addWorkOrder(orderData);

      // PASO 2: Marcar ticket como completado
      // Esto hace que desaparezca de "Mis Tickets" del técnico
      await editTicket(ticket.id, { status: "completed" });

      // PASO 3: Mostrar confirmación
      setSubmitted(true);

      // PASO 4: Después de 1.5s, abrir Zoho en ventana nueva y redirigir a /tickets
      setTimeout(() => {
        // Construir URL de Zoho con campos pre-rellenados
        const clientName = (formData.get("cliente_nombre") as string) || "";
        const clientLocal = (formData.get("cliente_local") as string) || "";
        
        const zohoUrlWithPrefill = buildZohoUrlWithPrefill(
          user.name,
          user.email,
          ticket.id,
          ticket.address,
          clientName,
          clientLocal
        );
        
        // Abrir Zoho en ventana/pestaña NUEVA (sin bloquear CoordinaTech)
        window.open(zohoUrlWithPrefill, "_blank", "width=1024,height=800");
        
        // Luego redirigir a /tickets automáticamente después de 1s
        setTimeout(() => {
          router.replace("/tickets");
        }, 1000);
      }, 1500);
    } catch (error) {
      console.error("Error al completar orden:", error);
      setErrorMsg(
        error instanceof Error ? error.message : "Error al completar la orden. Intenta de nuevo."
      );
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="stack-lg" style={{ maxWidth: 640, margin: "0 auto" }}>
        <article className="panel" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <CheckCircle2 size={56} color="var(--brand)" style={{ marginBottom: "1rem" }} />
          <h2 style={{ margin: "0 0 0.5rem" }}>¡Orden completada!</h2>
          <p className="muted" style={{ lineHeight: 1.6, marginBottom: "1.5rem" }}>
            ✓ Se guardó tu orden de soporte en CoordinaTech
            <br />
            <br />
            📱 <strong>Se abrirá el formulario Zoho en una ventana nueva</strong> para que completes los detalles técnicos, calificación y firma.
            <br />
            <br />
            Serás redirigido a tu bandeja de tickets automáticamente...
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.88rem", color: "var(--muted)" }}>Abriendo formulario...</span>
          </div>
        </article>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="stack-lg"
      style={{ maxWidth: 600, margin: "0 auto" }}
    >
      {/* ── Cabecera ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href={`/tickets/${id}`} className="outline-btn" style={{ fontSize: "0.82rem" }}>
          <ArrowLeft size={13} /> Volver
        </Link>
        <div>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>Ticket #{ticket.id}</p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>{ticket.title}</p>
        </div>
      </div>

      {/* ── Card principal ── */}
      <article
        className="panel"
        style={{
          background: "var(--surface)",
          borderLeft: "4px solid var(--brand)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
            Completar Orden de Soporte
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.5 }}>
            Confirma los datos de tu trabajo y se abrirá el formulario oficial de Zoho para que
            lo llenes completamente con todos los detalles técnicos.
          </p>
        </div>

        {/* ── Datos del técnico (solo lectura) ── */}
        <div
          style={{
            background: "var(--surface-2)",
            borderRadius: "var(--r-md)",
            padding: "1rem",
            marginBottom: "1.5rem",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            📋 Datos Registrados
          </p>
          <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.88rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Técnico:</span>
              <strong>{user.name}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Email:</span>
              <strong>{user.email}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Ticket:</span>
              <strong>{ticket.id}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Dirección:</span>
              <strong style={{ textAlign: "right" }}>{ticket.address}</strong>
            </div>
          </div>
        </div>

        {/* ── Campos opcionales ── */}
        <div style={{ marginBottom: "1.5rem", display: "grid", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Nombre del Cliente (opcional)
            </span>
            <input
              type="text"
              name="cliente_nombre"
              placeholder="Ej: Empresa XYZ"
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                fontSize: "0.88rem",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Local/Sucursal (opcional)
            </span>
            <input
              type="text"
              name="cliente_local"
              placeholder="Ej: Sucursal Centro"
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                fontSize: "0.88rem",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
              Solución Aplicada (opcional)
            </span>
            <textarea
              name="solucion"
              placeholder="Breve descripción de lo que hiciste..."
              style={{
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                fontSize: "0.88rem",
                minHeight: "80px",
                fontFamily: "inherit",
              }}
            />
          </label>
        </div>

        {/* ── Nota informativa ── */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "var(--r-sm)",
            padding: "0.85rem",
            marginBottom: "1.5rem",
            fontSize: "0.8rem",
            color: "#1e40af",
            lineHeight: 1.5,
          }}
        >
          <strong>ℹ️ Próximo paso:</strong> Al hacer clic en "Enviar", tu orden se guardará y se
          abrirá el <strong>formulario oficial de Zoho</strong> con estos campos <strong>ya pre-rellenados</strong>:
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            <li>✓ Nombre del técnico: <strong>{user.name}</strong></li>
            <li>✓ Email: <strong>{user.email}</strong></li>
            <li>✓ Código de solicitud: <strong>{ticket.id}</strong></li>
            <li>✓ Dirección: <strong>{ticket.address}</strong></li>
          </ul>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>
            En Zoho completarás: problemática, solución, pruebas, calificación y firma.
          </p>
        </div>

        {/* ── Errores ── */}
        {errorMsg && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "var(--r-sm)",
              padding: "0.85rem",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              color: "#991b1b",
            }}
          >
            ❌ {errorMsg}
          </div>
        )}

        {/* ── Botones ── */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <Link href={`/tickets/${id}`} className="outline-btn">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
            style={{
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? (
              <>
                <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                Procesando...
              </>
            ) : (
              <>
                <Send size={14} /> Enviar a Zoho
              </>
            )}
          </button>
        </div>
      </article>
    </form>
  );
}

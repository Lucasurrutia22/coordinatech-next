"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Clock, Edit2, MapPin, Play, RefreshCw, Upload, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { WorkTimer } from "@/components/WorkTimer";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import { TicketStatus } from "@/types/domain";

// ── Stepper ─────────────────────────────────────────────────
function StatusStepper({ status }: { status: TicketStatus }) {
  const isNC = status === "not_completed";
  const steps: { key: TicketStatus; label: string }[] = [
    { key: "pending",       label: "Nuevo"          },
    { key: "assigned",      label: "Asignado"       },
    { key: "in_progress",   label: "En progreso"    },
    isNC
      ? { key: "not_completed", label: "No completado" }
      : { key: "completed",     label: "Completado"    },
  ];
  const currentIdx = isNC ? 3 : steps.findIndex((s) => s.key === status);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", padding: "0.5rem 0 0.25rem", overflowX: "auto" }}>
      {steps.map((step, i) => {
        const done      = i < currentIdx;
        const active    = i === currentIdx;
        const isNCStep  = step.key === "not_completed";
        const circleColor  = isNCStep && active ? "#dc2626" : done || active ? "var(--brand)" : "var(--surface-alt)";
        const circleBorder = isNCStep && active ? "#dc2626" : done || active ? "var(--brand)" : "var(--line)";
        const lineColor    = i < currentIdx ? (i === 2 && isNC ? "#dc2626" : "var(--brand)") : "var(--line)";
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "flex-start", flex: i < steps.length - 1 ? 1 : "unset" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 60 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: circleColor, border: `2px solid ${circleBorder}`,
                color: done || active ? "#fff" : "var(--muted)",
                fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, transition: "all 0.2s",
              }}>
                {isNCStep && active ? "✗" : done ? "✓" : i + 1}
              </div>
              <span style={{
                fontSize: "0.65rem", marginTop: 4, textAlign: "center",
                color: isNCStep && active ? "#dc2626" : active ? "var(--brand)" : done ? "var(--brand)" : "var(--muted)",
                fontWeight: active ? 700 : 400, lineHeight: 1.2, whiteSpace: "nowrap",
              }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, marginTop: 13, background: lineColor, transition: "background 0.2s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SLA helper ───────────────────────────────────────────────
function getSLA(scheduledDate: string, status: TicketStatus) {
  if (status === "completed" || status === "not_completed") return null;
  const diffMs = new Date(scheduledDate).getTime() - Date.now();
  const overdue = diffMs < 0;
  const totalH  = Math.abs(Math.floor(diffMs / 3_600_000));
  const mins    = Math.abs(Math.floor((diffMs % 3_600_000) / 60_000));
  const days    = Math.floor(totalH / 24);
  const remH    = totalH % 24;

  let label: string;
  if (overdue)        label = totalH >= 24 ? `Vencido hace ${days}d ${remH}h` : `Vencido hace ${totalH}h ${mins}m`;
  else if (totalH < 2) label = `${totalH}h ${mins}m restantes`;
  else if (totalH < 24) label = `${totalH}h restantes`;
  else                  label = `${days}d ${remH}h restantes`;

  const color  = overdue ? "#dc2626" : totalH < 24 ? "#d97706" : "#16a34a";
  const bg     = overdue ? "#fef2f2" : totalH < 24 ? "#fffbeb" : "#f0fdf4";
  const border = overdue ? "#fca5a5" : totalH < 24 ? "#fcd34d" : "#86efac";
  return { label, color, bg, border, overdue };
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tickets, technicians, user, editTicket, incompleteReports, addIncompleteReport, refreshData } = useAppContext();

  // ── Modal "No completado" — estado ──────────────────────
  const [showNCModal,  setShowNCModal]  = useState(false);
  const [ncReason,     setNcReason]     = useState("");
  const [ncPhoto,      setNcPhoto]      = useState("");
  const [ncPhotoName,  setNcPhotoName]  = useState("");
  const [ncSubmitting, setNcSubmitting] = useState(false);
  const [ncError,      setNcError]      = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Buscar ticket (después de hooks) ────────────────────
  const ticket = tickets.find((item) => item.id === id);
  if (!ticket) {
    return <section className="panel">Ticket no encontrado.</section>;
  }

  const tech       = technicians.find((item) => item.id === ticket.technician_id);
  const isMyTicket = user?.role === "tech" && user.id === ticket.technician_id;
  const sla        = user?.role === "admin" ? getSLA(ticket.scheduled_date, ticket.status) : null;
  const ncReport   = incompleteReports.find((r) => r.ticket_id === ticket.id);

  // ── Handlers (con ticket ya garantizado no-null) ────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNcError("El archivo debe ser una imagen."); return; }
    setNcError("");
    setNcPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setNcPhoto((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
  };

  const openNCModal = () => {
    setNcReason("");
    setNcPhoto("");
    setNcPhotoName("");
    setNcError("");
    setShowNCModal(true);
  };

  const handleSubmitNC = async () => {
    if (!ncReason.trim()) { setNcError("El motivo es obligatorio."); return; }
    setNcError("");
    setNcSubmitting(true);

    try {
      // 1. Guardar el reporte de evidencia (best-effort)
      try {
        await addIncompleteReport({
          ticket_id:  ticket.id,
          tech_id:    user!.id,
          tech_name:  user!.name,
          reason:     ncReason.trim(),
          photo_data: ncPhoto,
        });
      } catch (err) {
        console.warn("No se pudo guardar el reporte de evidencia:", err);
      }

      // 2. Actualizar el ticket a "not_completed" y limpiar técnico
      await editTicket(ticket.id, { 
        status: "not_completed",
        technician_id: "" // Limpiar para reasignación
      });
      
      // 2.5. Esperar a que refreshData() sincronice completamente
      await refreshData();

      // 3. Cerrar modal inmediatamente
      setShowNCModal(false);
      setNcSubmitting(false);
      
      // 4. Redirigir a /tickets después de sincronizar completamente
      router.push("/tickets");
      
    } catch (err) {
      console.error("Error al marcar como no completado:", err);
      setNcError("No se pudo actualizar el ticket. Intenta nuevamente.");
      setNcSubmitting(false);
    }
  };

  const handleStartWork = () => editTicket(ticket.id, { status: "in_progress" });
  const handleAccept    = () => editTicket(ticket.id, { status: "in_progress" });
  const handleReject    = () => editTicket(ticket.id, { status: "pending", technician_id: "" });
  const handleReassign  = () => editTicket(ticket.id, { status: "pending", technician_id: "" });

  return (
    <div className="stack-lg">
      {/* ── Top bar ── */}
      <div className="row-between">
        <Link href="/tickets" className="outline-btn" style={{ fontSize: "0.82rem" }}>
          <ArrowLeft size={13} /> Volver
        </Link>
        {user?.role === "admin" && (
          <Link href={`/tickets/${ticket.id}/edit`} className="primary-btn">
            <Edit2 size={13} /> Editar ticket
          </Link>
        )}
      </div>

      {/* ── Main card ── */}
      <article className="panel">
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Header: title + pills + SLA */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <p className="eyebrow">#{ticket.id}</p>
              <h2 style={{ margin: "0.25rem 0 0", fontSize: "1.35rem" }}>{ticket.title}</h2>
            </div>
            <div className="row-gap" style={{ flexWrap: "wrap" }}>
              <StatusPill status={ticket.status} />
              <PriorityPill priority={ticket.priority} />
              {sla && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "0.22rem 0.65rem", borderRadius: "var(--r-sm)",
                  background: sla.bg, color: sla.color,
                  border: `1px solid ${sla.border}`,
                  fontSize: "0.74rem", fontWeight: 600,
                }}>
                  <Clock size={11} /> SLA: {sla.label}
                </span>
              )}
            </div>
          </div>

          {/* Status stepper */}
          <StatusStepper status={ticket.status} />

          <p style={{ margin: 0, color: "var(--ink)", lineHeight: 1.6 }}>{ticket.description}</p>

          <div className="ticket-detail-grid">
            <div className="profile-card">
              <p className="eyebrow">Tecnico asignado</p>
              {tech ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginTop: "0.5rem" }}>
                  <Avatar name={tech.name} size={32} />
                  <div>
                    <p className="headline" style={{ fontSize: "0.9rem" }}>{tech.name}</p>
                    <p className="muted" style={{ fontSize: "0.76rem" }}>{tech.email}</p>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ marginTop: "0.4rem" }}>Sin asignar</p>
              )}
            </div>

            <div className="profile-card">
              <p className="eyebrow">Programado</p>
              <p className="headline" style={{ marginTop: "0.4rem", fontSize: "0.95rem" }}>
                {format(new Date(ticket.scheduled_date), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </p>
            </div>

            <div className="profile-card" style={{ gridColumn: "1 / -1" }}>
              <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <MapPin size={11} /> Direccion
              </p>
              <p className="headline" style={{ marginTop: "0.4rem", fontSize: "0.95rem" }}>{ticket.address}</p>
            </div>
          </div>
        </div>
      </article>

      {/* ══ PANEL DE ACCIONES ══════════════════════════════════════ */}

      {/* Admin: ticket nuevo → iniciar trabajo */}
      {user?.role === "admin" && ticket.status === "pending" && (
        <ActionPanel
          bg="#f0fdf4" border="#86efac"
          title="Ticket nuevo — sin iniciar"
          subtitle={`Puedes asignar un técnico desde "Editar ticket" o iniciar el trabajo directamente.`}
          titleColor="#15803d" subtitleColor="#16a34a"
        >
          <button
            onClick={handleStartWork}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.5rem 1.1rem", fontSize: "0.84rem", fontWeight: 600,
              border: "none", borderRadius: "var(--r-sm)",
              background: "#16a34a", color: "#fff", cursor: "pointer",
            }}
          >
            <Play size={14} /> Iniciar trabajo
          </button>
        </ActionPanel>
      )}

      {/* Técnico: ticket pendiente asignado a él */}
      {isMyTicket && ticket.status === "pending" && (
        <ActionPanel
          title="Ticket listo para iniciar"
          subtitle="Inicia el trabajo cuando estés listo en el lugar."
        >
          <button onClick={handleStartWork} className="primary-btn">
            <Play size={14} /> Comenzar trabajo
          </button>
        </ActionPanel>
      )}

      {/* Técnico: aceptar / rechazar */}
      {isMyTicket && ticket.status === "assigned" && (
        <ActionPanel
          title="Este ticket está asignado a ti"
          subtitle="¿Aceptas este trabajo o necesitas rechazarlo?"
        >
          <button
            onClick={handleReject}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 600,
              border: "1px solid #fca5a5", borderRadius: "var(--r-sm)",
              background: "#fff1f2", color: "#b91c1c", cursor: "pointer",
            }}
          >
            <XCircle size={14} /> Rechazar
          </button>
          <button onClick={handleAccept} className="primary-btn">
            <CheckCircle2 size={14} /> Aceptar trabajo
          </button>
        </ActionPanel>
      )}

      {/* Técnico/Admin: en progreso */}
      {(isMyTicket || user?.role === "admin") && ticket.status === "in_progress" && (
        <>
          <ActionPanel
            title="Cronómetro de Trabajo"
            subtitle="Registra el tiempo que dedicas a este ticket. Puedes pausar para descansos."
          >
            <WorkTimer
              ticketId={ticket.id}
              technicianId={tech?.id || user?.id || ""}
              userRole={user?.role as 'admin' | 'technician' | 'user'}
              compact={true}
              onWorkStarted={() => console.log("Trabajo iniciado")}
              onWorkPaused={() => console.log("Trabajo pausado")}
              onWorkCompleted={() => {
                // Recargar datos después de completar
                setTimeout(() => window.location.reload(), 500);
              }}
            />
          </ActionPanel>

          <ActionPanel
            title="Acciones Disponibles"
            subtitle="Completa la orden de soporte, o registra que el trabajo no pudo completarse."
          >
            <button
              onClick={openNCModal}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 600,
                border: "1px solid #fca5a5", borderRadius: "var(--r-sm)",
                background: "#fff1f2", color: "#b91c1c", cursor: "pointer",
              }}
            >
              <XCircle size={14} /> No completado
            </button>
            <Link
              href={`/tickets/${ticket.id}/orden-soporte`}
              className="primary-btn"
              style={{ textDecoration: "none" }}
            >
              <ClipboardCheck size={14} /> Completar Orden de Soporte
            </Link>
          </ActionPanel>
        </>
      )}

      {/* ── Panel de evidencia: ticket no completado ── */}
      {ticket.status === "not_completed" && ncReport && (
        <div style={{
          background: "#fff7ed", border: "1px solid #fdba74",
          borderRadius: "var(--r-md)", padding: "1.1rem 1.25rem",
          boxShadow: "var(--shadow-xs)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
            <AlertTriangle size={16} color="#c2410c" />
            <span style={{ fontWeight: 700, color: "#c2410c", fontSize: "0.92rem" }}>Trabajo no completado</span>
            <span style={{ marginLeft: "auto", fontSize: "0.74rem", color: "#9a3412" }}>
              Reportado por <strong>{ncReport.tech_name}</strong> · {format(new Date(ncReport.reported_at), "dd MMM yyyy, HH:mm", { locale: es })}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: ncReport.photo_data ? "1fr auto" : "1fr", gap: "1rem", alignItems: "start" }}>
            <div style={{ background: "white", borderRadius: "var(--r-sm)", padding: "0.85rem 1rem", border: "1px solid #fed7aa" }}>
              <p className="eyebrow" style={{ marginBottom: "0.4rem", color: "#c2410c" }}>Motivo del no completado</p>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--ink)" }}>{ncReport.reason}</p>
            </div>
            {ncReport.photo_data && (
              <div style={{ background: "white", borderRadius: "var(--r-sm)", padding: "0.6rem", border: "1px solid #fed7aa" }}>
                <p className="eyebrow" style={{ marginBottom: "0.4rem", color: "#c2410c", fontSize: "0.66rem", textAlign: "center" }}>
                  <Camera size={10} style={{ display: "inline", marginRight: 3 }} />Evidencia
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ncReport.photo_data}
                  alt="Evidencia fotográfica"
                  style={{ display: "block", width: 160, height: 120, objectFit: "cover", borderRadius: "var(--r-xs)", cursor: "pointer" }}
                  onClick={() => window.open(ncReport.photo_data)}
                />
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.68rem", color: "var(--muted)", textAlign: "center" }}>Click para ampliar</p>
              </div>
            )}
          </div>
          {user?.role === "admin" && (
            <div style={{ marginTop: "0.9rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleReassign}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0.5rem 1.1rem", fontSize: "0.84rem", fontWeight: 600,
                  border: "none", borderRadius: "var(--r-sm)",
                  background: "#ea580c", color: "#fff", cursor: "pointer",
                }}
              >
                <RefreshCw size={14} /> Reasignar ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin: no_completed sin reporte local aún */}
      {ticket.status === "not_completed" && !ncReport && user?.role === "admin" && (
        <ActionPanel
          bg="#fff7ed" border="#fdba74"
          title="Ticket no completado"
          subtitle="El técnico no pudo completar el trabajo. Puedes reasignarlo a otro técnico."
          titleColor="#c2410c" subtitleColor="#9a3412"
        >
          <button
            onClick={handleReassign}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "0.5rem 1.1rem", fontSize: "0.84rem", fontWeight: 600,
              border: "none", borderRadius: "var(--r-sm)",
              background: "#ea580c", color: "#fff", cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Reasignar ticket
          </button>
        </ActionPanel>
      )}

      {/* ══ MODAL: REGISTRAR NO COMPLETADO ═══════════════════════ */}
      {showNCModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface)", borderRadius: "var(--r-lg)",
            padding: "1.5rem", width: "100%", maxWidth: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column", gap: "1.1rem",
            maxHeight: "90vh", overflowY: "auto",
          }}>
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={18} color="#dc2626" />
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#dc2626" }}>Registrar No Completado</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNCModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <XCircle size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
              Describe el motivo por el que no se pudo completar el trabajo. Puedes adjuntar una foto como evidencia (opcional). El ticket quedará marcado como <strong style={{ color: "#dc2626" }}>No completado</strong> y el administrador podrá reasignarlo.
            </p>

            {/* Photo upload */}
            <div>
              <p style={{ margin: "0 0 0.45rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 5 }}>
                <Camera size={14} /> Evidencia fotográfica <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400 }}>(opcional)</span>
              </p>
              <div
                style={{
                  border: `2px dashed ${ncPhoto ? "#16a34a" : "var(--line)"}`,
                  borderRadius: "var(--r-sm)", padding: "0.9rem",
                  textAlign: "center",
                  background: ncPhoto ? "#f0fdf4" : "var(--surface-alt)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {ncPhoto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ncPhoto}
                      alt="Preview"
                      style={{ display: "block", maxHeight: 140, margin: "0 auto 0.5rem", borderRadius: "var(--r-xs)", objectFit: "cover", maxWidth: "100%" }}
                    />
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#15803d", fontWeight: 600 }}>✓ {ncPhotoName}</p>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.7rem", color: "var(--muted)" }}>Click para cambiar la foto</p>
                  </>
                ) : (
                  <>
                    <Upload size={26} color="var(--muted)" style={{ display: "block", margin: "0 auto 0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)" }}>Seleccionar foto</p>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>PNG, JPG, HEIC — desde cámara o galería</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>

            {/* Reason textarea */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: "0.45rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>
                <ClipboardCheck size={14} /> Motivo del no completado <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                value={ncReason}
                onChange={(e) => { setNcReason(e.target.value); if (ncError) setNcError(""); }}
                placeholder="Describe detalladamente por qué no se pudo completar el trabajo (acceso denegado, falta de materiales, condiciones inseguras, cliente ausente, etc.)"
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.6rem 0.75rem", fontSize: "0.84rem",
                  border: `1px solid ${ncError && !ncReason.trim() ? "#fca5a5" : "var(--line)"}`,
                  borderRadius: "var(--r-sm)", resize: "vertical",
                  background: "var(--surface)", color: "var(--ink)",
                  fontFamily: "inherit", lineHeight: 1.5,
                }}
              />
            </div>

            {/* Error message */}
            {ncError && (
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}>
                <AlertTriangle size={13} /> {ncError}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end", paddingTop: "0.25rem" }}>
              <button
                type="button"
                onClick={() => setShowNCModal(false)}
                className="outline-btn"
                style={{ fontSize: "0.84rem" }}
                disabled={ncSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitNC}
                disabled={ncSubmitting}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "0.5rem 1.1rem", fontSize: "0.84rem", fontWeight: 600,
                  border: "none", borderRadius: "var(--r-sm)",
                  background: ncSubmitting ? "#fca5a5" : "#dc2626",
                  color: "#fff", cursor: ncSubmitting ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {ncSubmitting ? "Registrando…" : <><AlertTriangle size={14} /> Registrar No Completado</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reusable action panel ──────────────────────────────────── */
function ActionPanel({
  title, subtitle, children,
  bg = "var(--surface)", border = "var(--line)",
  titleColor = "var(--ink)", subtitleColor = "var(--muted)",
}: {
  title: string; subtitle: string; children: React.ReactNode;
  bg?: string; border?: string; titleColor?: string; subtitleColor?: string;
}) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: "var(--r-md)", padding: "1rem 1.25rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "0.75rem", boxShadow: "var(--shadow-xs)",
    }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: titleColor, fontSize: "0.9rem" }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: subtitleColor }}>{subtitle}</p>
      </div>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

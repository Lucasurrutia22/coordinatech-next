"use client";

import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAppContext } from "@/context/AppContext";
import { DocumentUploader, DocumentFile } from "@/components/DocumentUploader";
import { WorkPhotoCapture } from "@/components/WorkPhotoCapture";
import { MapViewer } from "@/components/MapViewer";
const ZOHO_URL =
  "https://forms.zohopublic.com/virtualoffice12892/form/OrdendeSoporte/formperma/dvHAoHck2qvyQ8lww42gPBGtdn5T_xvx0896QCrQbrw/htmlRecords/submit";

/* ─── Firma canvas ─────────────────────────────────────── */
function SignaturePad({
  sigInputRef,
}: {
  sigInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos =
      e.nativeEvent instanceof MouseEvent
        ? getPos(e.nativeEvent, canvas)
        : getPos((e.nativeEvent as TouchEvent).touches[0], canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos =
      e.nativeEvent instanceof MouseEvent
        ? getPos(e.nativeEvent, canvas)
        : getPos((e.nativeEvent as TouchEvent).touches[0], canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000e17";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    if (sigInputRef.current) {
      sigInputRef.current.value = canvas.toDataURL();
    }
    setHasSignature(true);
  };

  const stopDraw = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sigInputRef.current) sigInputRef.current.value = "";
    setHasSignature(false);
  };

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        style={{
          border: `1.5px solid ${hasSignature ? "var(--brand)" : "var(--line)"}`,
          borderRadius: "var(--r-sm)",
          width: "100%",
          height: 160,
          touchAction: "none",
          cursor: "crosshair",
          background: "#fafafa",
          display: "block",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          {hasSignature ? "✓ Firma registrada" : "Firme arriba con el dedo o el cursor"}
        </span>
        <button
          type="button"
          onClick={clear}
          style={{
            fontSize: "0.72rem",
            color: "var(--muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

/* ─── Rating picker ────────────────────────────────────── */
function RatingPicker({
  ratingInputRef,
}: {
  ratingInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [selected, setSelected] = useState(0);

  const pick = (n: number) => {
    setSelected(n);
    if (ratingInputRef.current) ratingInputRef.current.value = String(n);
  };

  const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => pick(n)}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: `2px solid ${n <= selected ? "var(--brand)" : "var(--line)"}`,
              background: n <= selected ? "var(--brand)" : "transparent",
              color: n <= selected ? "#fff" : "var(--muted)",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.12s",
              flexShrink: 0,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {selected > 0 && (
        <span style={{ fontSize: "0.78rem", color: "var(--brand-secondary)", fontWeight: 600 }}>
          {LABELS[selected]}
        </span>
      )}
    </div>
  );
}

/* ─── Sección header ───────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 1.25rem",
        fontSize: "0.88rem",
        fontWeight: 700,
        color: "var(--muted)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        borderBottom: "1px solid var(--line)",
        paddingBottom: "0.65rem",
      }}
    >
      {children}
    </h3>
  );
}

/* ─── Página principal ─────────────────────────────────── */
export default function OrdenSoportePage() {
  const { id } = useParams<{ id: string }>();
  const { tickets, user, addWorkOrder } = useAppContext();

  const ticket = tickets.find((t) => t.id === id);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const ratingInputRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [ratingError, setRatingError] = useState(false);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [photoData, setPhotoData] = useState<{
    photo: string;
    gps?: { lat: number; lng: number; accuracy?: number };
    timestamp: string;
  } | null>(null);

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

  const nameParts = user.name.trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";

  const scheduledFormatted = (() => {
    try {
      return format(new Date(ticket.scheduled_date), "dd-MMM-yyyy hh:mm a", { locale: es });
    } catch {
      return ticket.scheduled_date;
    }
  })();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const rating = ratingInputRef.current?.value ?? "0";
    if (!rating || rating === "0") {
      e.preventDefault();
      setRatingError(true);
      document.getElementById("rating-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setRatingError(false);

    // Capturar campos del formulario sincrónicamente antes del re-render
    const form = e.currentTarget;
    const g = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";

    const orderData = {
      ticket_id: ticket.id,
      tech_name: `${g("Name_First")} ${g("Name_Last")}`.trim(),
      tech_email: g("Email"),
      cliente_nombre: g("SingleLine1"),
      cliente_local: g("SingleLine2"),
      cliente_direccion: g("SingleLine3"),
      cliente_ciudad: g("SingleLine4"),
      problematica: g("MultiLine"),
      solucion: g("MultiLine1"),
      pruebas: g("MultiLine2"),
      reemplazo_equipo: g("Radio"),
      retira_equipo: Boolean(
        (form.elements.namedItem("CheckBox") as HTMLInputElement | null)?.checked,
      ),
      supervisor_nombre: `${g("Name_First2")} ${g("Name_Last2")}`.trim(),
      recibe_nombre: `${g("Name_First3")} ${g("Name_Last3")}`.trim(),
      recibe_cargo: g("SingleLine5"),
      rating: parseInt(rating, 10),
      razon_calificacion: g("MultiLine3"),
      documents: documents,
      // ✨ NUEVO: Foto con ubicación GPS (solo si fue capturada)
      ...(photoData && {
        work_photo: {
          photo: photoData.photo,
          gps: photoData.gps,
          timestamp: photoData.timestamp,
        }
      })
    };

    // Guardar en Supabase/localStorage (fire-and-forget - el form continúa a Zoho)
    addWorkOrder(orderData).catch(console.error);

    setSubmitted(true);
    // El form continúa enviándose a Zoho en una nueva pestaña (target="_blank")
  };

  if (submitted) {
    return (
      <div className="stack-lg" style={{ maxWidth: 640, margin: "0 auto" }}>
        <article className="panel" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <CheckCircle2
            size={56}
            color="var(--brand)"
            style={{ marginBottom: "1rem" }}
          />
          <h2 style={{ margin: "0 0 0.5rem" }}>Orden enviada correctamente</h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            La Orden de Soporte en Terreno fue enviada. El sistema Zoho notificará al
            administrador con toda la información del trabajo realizado.
          </p>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/tickets/${id}`} className="outline-btn">
              Ver ticket
            </Link>
            <Link href="/tickets" className="primary-btn">
              Ir a mis tickets
            </Link>
          </div>
        </article>
      </div>
    );
  }

  return (
    <form
      action={ZOHO_URL}
      method="POST"
      target="_blank"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className="stack-lg"
      style={{ maxWidth: 860, margin: "0 auto" }}
    >
      {/* ── Cabecera ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <Link href={`/tickets/${id}`} className="outline-btn" style={{ fontSize: "0.82rem" }}>
          <ArrowLeft size={13} /> Volver al ticket
        </Link>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted)" }}>Ticket #{ticket.id}</p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.92rem", color: "var(--ink)" }}>
            {ticket.title}
          </p>
        </div>
      </div>

      {/* Título del formulario */}
      <div
        style={{
          background: "var(--primary)",
          borderRadius: "var(--r-lg)",
          padding: "1.25rem 1.5rem",
          color: "#fff",
        }}
      >
        <p
          style={{
            margin: "0 0 0.3rem",
            fontSize: "0.67rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.65,
          }}
        >
          Formulario oficial
        </p>
        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>
          Orden de Soporte en Terreno
        </h2>
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 1: DATOS DE TERRENO                  */}
      {/* ══════════════════════════════════════════════ */}
      <article className="panel">
        <SectionTitle>📋 Datos de Terreno</SectionTitle>
        <div className="form-grid">
          <label>
            Código de Solicitud <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="SingleLine"
              defaultValue={ticket.id}
              required
            />
          </label>

          <label>
            Fecha de Visita
            <input
              name="Date"
              defaultValue={scheduledFormatted}
            />
          </label>

          <label>
            Nombre del Técnico <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="Name_First"
              defaultValue={firstName}
              required
            />
          </label>

          <label>
            Apellido del Técnico
            <input
              name="Name_Last"
              defaultValue={lastName}
            />
          </label>

          <label className="full">
            Correo del Técnico <span style={{ color: "var(--danger)" }}>*</span>
            <input
              type="email"
              name="Email"
              defaultValue={user.email}
              required
            />
          </label>
        </div>
      </article>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 2: DATOS DEL CLIENTE                  */}
      {/* ══════════════════════════════════════════════ */}
      <article className="panel">
        <SectionTitle>👤 Datos del Cliente</SectionTitle>
        <div className="form-grid">
          <label className="full">
            Nombre del Cliente <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="SingleLine1"
              placeholder="Ingrese el nombre del cliente"
              required
            />
          </label>

          <label>
            Nombre del Local <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="SingleLine2"
              placeholder="Nombre de la sucursal o local"
              required
            />
          </label>

          <label>
            Dirección <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="SingleLine3"
              defaultValue={ticket.address}
              required
            />
          </label>

          <label>
            Ciudad
            <input
              name="SingleLine4"
              placeholder="Ciudad"
            />
          </label>
        </div>
      </article>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 3: DETALLES DE INCIDENCIA             */}
      {/* ══════════════════════════════════════════════ */}
      <article className="panel">
        <SectionTitle>🔧 Detalles de Incidencia</SectionTitle>
        <div className="form-grid">
          <label className="full">
            Problemática <span style={{ color: "var(--danger)" }}>*</span>
            <textarea
              name="MultiLine"
              placeholder="Indique la dificultad presentada o reportada"
              defaultValue={ticket.description}
              required
              style={{ minHeight: 90 }}
            />
          </label>

          <label className="full">
            Solución Aplicada <span style={{ color: "var(--danger)" }}>*</span>
            <textarea
              name="MultiLine1"
              placeholder="Indique lo realizado para resolver la problemática"
              required
              style={{ minHeight: 90 }}
            />
          </label>

          <label className="full">
            Pruebas Realizadas <span style={{ color: "var(--danger)" }}>*</span>
            <textarea
              name="MultiLine2"
              placeholder="Indique qué pruebas se realizaron luego de aplicar la solución"
              required
              style={{ minHeight: 80 }}
            />
          </label>

          <label>
            ¿Se Reemplazó Equipo o Componente? <span style={{ color: "var(--danger)" }}>*</span>
            <select name="Radio" required>
              <option value="">Seleccionar</option>
              <option value="No">No</option>
              <option value="Si">Sí</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", paddingTop: "1.5rem" }}>
            <input
              type="checkbox"
              id="retiraEquipo"
              name="CheckBox"
              value="Se retira equipo"
              style={{ width: "auto", cursor: "pointer" }}
            />
            <label
              htmlFor="retiraEquipo"
              style={{ display: "block", margin: 0, fontSize: "0.88rem", cursor: "pointer" }}
            >
              Se retira equipo{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.78rem" }}>
                (para revisión en laboratorio)
              </span>
            </label>
          </div>

          <label>
            Nombre Supervisor Soporte ZeroQ <span style={{ color: "var(--danger)" }}>*</span>
            <input
              name="Name_First2"
              placeholder="Nombre del supervisor"
              required
            />
          </label>

          <label>
            Apellido Supervisor
            <input
              name="Name_Last2"
              placeholder="Indique quién fue el encargado de Mesa de Soporte"
            />
          </label>
        </div>
      </article>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 4: CONFIRMACIÓN DE CLIENTE            */}
      {/* ══════════════════════════════════════════════ */}
      <article className="panel">
        <SectionTitle>✅ Confirmación de Cliente</SectionTitle>
        <div className="form-grid">
          <label>
            Nombre quien recibe <span style={{ color: "var(--danger)" }}>*</span>
            <input name="Name_First3" required />
          </label>

          <label>
            Apellido quien recibe
            <input name="Name_Last3" />
          </label>

          <label>
            Cargo <span style={{ color: "var(--danger)" }}>*</span>
            <input name="SingleLine5" required />
          </label>

          {/* Rating */}
          <div className="full" id="rating-section" style={{ display: "grid", gap: "0.6rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ink-2)",
              }}
            >
              ¿Cuál es su nivel de conformidad por el servicio entregado?{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </p>
            <input type="hidden" name="Rating" ref={ratingInputRef} />
            <RatingPicker ratingInputRef={ratingInputRef} />
            {ratingError && (
              <p className="error-text" style={{ fontSize: "0.78rem" }}>
                Por favor seleccione una calificación
              </p>
            )}
          </div>

          <label className="full">
            Señale la razón de su calificación <span style={{ color: "var(--danger)" }}>*</span>
            <textarea
              name="MultiLine3"
              placeholder="Describa por qué otorgó esa calificación"
              required
              style={{ minHeight: 80 }}
            />
          </label>

          {/* Firma */}
          <div className="full" style={{ display: "grid", gap: "0.5rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--ink-2)",
              }}
            >
              Firma Recepción Trabajo <span style={{ color: "var(--danger)" }}>*</span>
            </p>
            <input type="hidden" name="Signature" ref={sigInputRef} />
            <SignaturePad sigInputRef={sigInputRef} />
          </div>
        </div>
      </article>

      {/* ══════════════════════════════════════════════ */}
      {/* SECCIÓN 5: CARGA DE DOCUMENTOS Y EVIDENCIA    */}
      {/* ══════════════════════════════════════════════ */}
      <article className="panel">
        <SectionTitle>📎 Documentación del Trabajo</SectionTitle>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Capture fotos del trabajo realizado con ubicación GPS y/o cargue documentos adicionales como screenshots, comprobantes o evidencia que respalde el trabajo.
        </p>

        {/* ─── Foto con GPS ─── */}
        <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--line)" }}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>
            📸 Foto del Trabajo Realizado
          </h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.78rem", color: "var(--muted)" }}>
            Capture una foto en vivo con ubicación GPS automática (opcional)
          </p>
          <WorkPhotoCapture
            onPhotoCapture={setPhotoData}
            onPhotoClear={() => setPhotoData(null)}
          />
          {photoData?.gps && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }}>
                📍 Ubicación capturada:
              </p>
              <MapViewer
                locations={[{
                  lat: photoData.gps.lat,
                  lng: photoData.gps.lng,
                  label: `Capturado: ${new Date(photoData.timestamp).toLocaleTimeString('es-CL')}`,
                  timestamp: new Date(photoData.timestamp),
                }]}
                height="300px"
              />
            </div>
          )}
        </div>

        {/* ─── Documentos y Más Imágenes ─── */}
        <div>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)" }}>
            📁 Documentos e Imágenes Adicionales
          </h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.78rem", color: "var(--muted)" }}>
            Cargue documentos, screenshots o fotos adicionales (opcional)
          </p>
          <DocumentUploader documents={documents} onDocumentsChange={setDocuments} />
        </div>
      </article>

      {/* ── Botones ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          flexWrap: "wrap",
          paddingBottom: "2rem",
        }}
      >
        <Link href={`/tickets/${id}`} className="outline-btn">
          Cancelar
        </Link>
        <button type="submit" className="primary-btn" style={{ minWidth: 200 }}>
          <Send size={14} /> Enviar Orden de Soporte
        </button>
      </div>
    </form>
  );
}

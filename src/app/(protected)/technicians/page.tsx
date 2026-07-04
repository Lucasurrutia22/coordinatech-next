"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Power, Search, Shield, SquarePen, X } from "lucide-react";
import { RoleOnly } from "@/components/RoleGuard";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import { Technician } from "@/types/domain";
import { createTechnicianSchema, updateTechnicianSchema } from "@/lib/validationSchemas";

type StatusFilter = "all" | "active" | "inactive";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 10; i += 1) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

// ── Modal de alta/edición ─────────────────────────────────────────
// Declarado FUERA de TechniciansPage a propósito: si viviera anidado dentro
// del componente de página, React lo trataría como un tipo de componente
// nuevo en cada render y el formulario perdería el foco en cada tecla.
function TechnicianModal({
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: Technician;
  onClose: () => void;
  onSubmit: (payload: { name: string; email: string; phone: string; password?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState(mode === "create" ? generateTempPassword() : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");

    const schema = mode === "create" ? createTechnicianSchema : updateTechnicianSchema;
    const result = schema.safeParse({ name, email, phone, password: password || undefined });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({ name, email, phone, password: password || undefined });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)", borderRadius: "var(--r-lg)",
          padding: "1.5rem", width: "100%", maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column", gap: "1.1rem",
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>
            {mode === "create" ? "Nuevo técnico" : `Editar a ${initial?.name}`}
          </span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="form-grid compact">
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </label>
          <label>
            Correo
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </label>
          <label>
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </label>
          <label>
            {mode === "create" ? "Contraseña temporal" : "Nueva contraseña (opcional)"}
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              placeholder={mode === "edit" ? "Dejar en blanco para no cambiarla" : undefined}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </label>
          {mode === "create" && (
            <p className="muted full" style={{ fontSize: "0.76rem", margin: 0 }}>
              Contraseña temporal generada automáticamente. El técnico debería cambiarla en su primer ingreso.
            </p>
          )}

          {formError && <p className="error-text full">{formError}</p>}

          <div className="full row-end">
            <button type="button" className="outline-btn" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={submitting}>
              {submitting ? "Guardando..." : mode === "create" ? "Crear técnico" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TechniciansPage() {
  const { user, technicians, addTechnician, editTechnician } = useAppContext();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; technician: Technician } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredTechnicians = useMemo(() => {
    const q = query.toLowerCase().trim();
    return technicians.filter((tech) => {
      const matchesQuery =
        !q ||
        tech.name.toLowerCase().includes(q) ||
        tech.email.toLowerCase().includes(q) ||
        tech.phone.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && tech.active) ||
        (statusFilter === "inactive" && !tech.active);
      return matchesQuery && matchesStatus;
    });
  }, [technicians, query, statusFilter]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
  };

  const handleToggleActive = async (tech: Technician) => {
    if (tech.active) {
      const confirmed = confirm(`¿Seguro que deseas desactivar a ${tech.name}? No podrá iniciar sesión hasta reactivarlo.`);
      if (!confirmed) return;
    }
    setTogglingId(tech.id);
    try {
      await editTechnician(tech.id, { active: !tech.active });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <RoleOnly allow={["admin"]}>
      <section className="panel stack-lg" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="panel-header">
          <div>
            <h2 style={{ marginBottom: 0 }}>Usuarios</h2>
            <p className="muted" style={{ fontSize: "0.82rem" }}>
              Cuenta de administrador y {technicians.length} técnico{technicians.length !== 1 ? "s" : ""} registrados.
            </p>
          </div>
          <button type="button" className="primary-btn" onClick={() => setModal({ mode: "create" })}>
            <Plus size={15} /> Nuevo técnico
          </button>
        </div>

        <p className="muted" style={{ fontSize: "0.78rem", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Shield size={13} />
          <strong>Admin:</strong>&nbsp;acceso total al sistema. <strong>Técnico:</strong>&nbsp;solo sus tickets asignados.
        </p>

        {/* ── Cuenta de administrador (no editable desde aquí) ── */}
        {user?.role === "admin" && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              border: "1px solid var(--line)", borderRadius: "var(--r-md)",
              padding: "0.75rem 1rem", background: "var(--surface-alt, var(--surface))",
            }}
          >
            <Avatar name={user.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{user.name}</p>
              <p className="muted" style={{ margin: 0, fontSize: "0.76rem" }}>{user.email}</p>
            </div>
            <span className="role-pill">Admin</span>
            <span className="muted" style={{ fontSize: "0.72rem" }}>No editable desde aquí</span>
          </div>
        )}

        {/* ── Buscador y filtro de estado ── */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <Search size={14} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 2rem", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "0.84rem", background: "var(--surface)", color: "var(--ink)" }}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {([
              { value: "all", label: "Todos" },
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ] as const).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: "0.3rem 0.75rem", fontSize: "0.76rem", fontWeight: statusFilter === f.value ? 700 : 400,
                  borderRadius: "var(--r-sm)", border: `1px solid ${statusFilter === f.value ? "var(--brand)" : "var(--line)"}`,
                  background: statusFilter === f.value ? "var(--brand-dim)" : "var(--surface)",
                  color: statusFilter === f.value ? "var(--brand)" : "var(--muted)", cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Técnico</th>
                <th className="table-hide-xs">Correo</th>
                <th className="table-hide-xs">Teléfono</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTechnicians.map((tech) => (
                <tr key={tech.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <Avatar name={tech.name} size={30} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem" }}>{tech.name}</p>
                        <p className="muted" style={{ fontSize: "0.74rem" }}>ID: {tech.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-hide-xs" style={{ color: "var(--muted)" }}>{tech.email}</td>
                  <td className="table-hide-xs" style={{ color: "var(--muted)" }}>{tech.phone}</td>
                  <td>
                    <span className={`pill ${tech.active ? "status-completed" : "status-pending"}`}>
                      {tech.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        title="Editar técnico"
                        onClick={() => setModal({ mode: "edit", technician: tech })}
                        className="outline-btn"
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.76rem" }}
                      >
                        <SquarePen size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        title={tech.active ? "Desactivar técnico" : "Activar técnico"}
                        onClick={() => handleToggleActive(tech)}
                        disabled={togglingId === tech.id}
                        className="outline-btn"
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.76rem" }}
                      >
                        <Power size={13} /> {togglingId === tech.id ? "..." : tech.active ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTechnicians.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }}>
                    <p className="muted" style={{ marginBottom: technicians.length === 0 ? 0 : "0.5rem" }}>
                      {technicians.length === 0
                        ? "No hay técnicos aún."
                        : "No se encontraron técnicos con los filtros actuales."}
                    </p>
                    {technicians.length > 0 && (query || statusFilter !== "all") && (
                      <button type="button" className="outline-btn" style={{ fontSize: "0.8rem" }} onClick={clearFilters}>
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <TechnicianModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.technician : undefined}
          onClose={() => setModal(null)}
          onSubmit={async (payload) => {
            if (modal.mode === "create") {
              await addTechnician({ ...payload, password: payload.password ?? generateTempPassword(), active: true });
            } else {
              const update: Partial<Technician> = { name: payload.name, email: payload.email, phone: payload.phone };
              if (payload.password) update.password = payload.password;
              await editTechnician(modal.technician.id, update);
            }
          }}
        />
      )}
    </RoleOnly>
  );
}

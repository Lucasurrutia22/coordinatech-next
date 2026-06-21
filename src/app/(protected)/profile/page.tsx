"use client";

import { Mail, Phone, Shield, User } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="profile-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div className="metric-icon" style={{ width: 38, height: 38, flexShrink: 0 }}>{icon}</div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="headline" style={{ marginTop: "0.2rem", fontSize: "0.95rem" }}>{value ?? "—"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAppContext();

  return (
    <section className="stack-lg">
      <article className="panel" style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        <Avatar name={user?.name ?? "Usuario"} size={64} style={{ boxShadow: "var(--shadow-md)" }} />
        <div>
          <h2 style={{ margin: 0 }}>{user?.name ?? "Usuario"}</h2>
          <p className="muted">{user?.role === "admin" ? "Administrador del sistema" : "Tecnico de campo"}</p>
        </div>
        <span className="role-pill" style={{ marginLeft: "auto" }}>
          {user?.role === "admin" ? "Admin" : "Tecnico"}
        </span>
      </article>

      <article className="panel">
        <h2>Informacion de cuenta</h2>
        <div className="stack-sm">
          <Field icon={<User size={16} />}   label="Nombre completo" value={user?.name} />
          <Field icon={<Mail size={16} />}   label="Correo electronico" value={user?.email} />
          <Field icon={<Phone size={16} />}  label="ID de usuario" value={user?.id} />
          <Field icon={<Shield size={16} />} label="Rol en el sistema" value={user?.role === "admin" ? "Administrador" : "Tecnico"} />
        </div>
      </article>
    </section>
  );
}

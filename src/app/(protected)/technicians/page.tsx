"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { RoleOnly } from "@/components/RoleGuard";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";

export default function TechniciansPage() {
  const { technicians } = useAppContext();

  return (
    <RoleOnly allow={["admin"]}>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 style={{ marginBottom: 0 }}>Tecnicos</h2>
            <p className="muted">{technicians.length} tecnico{technicians.length !== 1 ? "s" : ""} registrados</p>
          </div>
          <Link href="/technicians/new" className="primary-btn">
            <Plus size={15} /> Nuevo tecnico
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tecnico</th>
                <th className="table-hide-xs">Correo</th>
                <th className="table-hide-xs">Telefono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((tech) => (
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
                </tr>
              ))}
            </tbody>
          </table>
          {technicians.length === 0 && (
            <p className="muted" style={{ padding: "1.5rem", textAlign: "center" }}>No hay tecnicos aun.</p>
          )}
        </div>
      </section>
    </RoleOnly>
  );
}

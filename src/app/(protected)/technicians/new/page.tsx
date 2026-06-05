"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleOnly } from "@/components/RoleGuard";
import { useAppContext } from "@/context/AppContext";

export default function NewTechnicianPage() {
  const router = useRouter();
  const { addTechnician } = useAppContext();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("tech123");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addTechnician({
      name,
      email,
      phone,
      password,
      active: true,
    });
    router.push("/technicians");
  };

  return (
    <RoleOnly allow={["admin"]}>
      <section className="panel">
        <h2>Nuevo tecnico</h2>
        <form onSubmit={submit} className="form-grid compact">
          <label>
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Correo
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Telefono
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
          <label>
            Contrasena
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          <div className="full row-end">
            <button type="submit" className="primary-btn">
              Crear tecnico
            </button>
          </div>
        </form>
      </section>
    </RoleOnly>
  );
}

import { redirect } from "next/navigation";

// La creación de técnicos ahora se hace desde un modal en /technicians.
// Esta ruta se conserva únicamente por compatibilidad con enlaces existentes.
export default function NewTechnicianRedirect() {
  redirect("/technicians");
}

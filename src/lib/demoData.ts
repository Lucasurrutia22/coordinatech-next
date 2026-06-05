import { Technician, Ticket } from "@/types/domain";

export const demoTechnicians: Technician[] = [
  {
    id: "TECH-001",
    name: "Juan Perez",
    email: "juan.perez@company.com",
    phone: "+56 9 1111 1111",
    password: "tech123",
    active: true,
  },
  {
    id: "TECH-002",
    name: "Ana Gonzalez",
    email: "ana.gonzalez@company.com",
    phone: "+56 9 2222 2222",
    password: "tech123",
    active: true,
  },
];

export const demoTickets: Ticket[] = [
  {
    id: "ST-001",
    ticket_type: "support",
    title: "Falla de conectividad en sucursal",
    description: "Cliente reporta intermitencia en red interna y puntos de venta.",
    address: "Av. Libertador 1024, Santiago",
    status: "assigned",
    priority: "high",
    scheduled_date: new Date().toISOString(),
    technician_id: "TECH-001",
    created_at: new Date().toISOString(),
  },
  {
    id: "INS-001",
    ticket_type: "installation",
    title: "Mantenimiento preventivo CCTV",
    description: "Revision mensual de camaras y respaldo de grabaciones.",
    address: "Camino El Alba 445, Las Condes",
    status: "pending",
    priority: "medium",
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    technician_id: "TECH-002",
    created_at: new Date().toISOString(),
  },
];

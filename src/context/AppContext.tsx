"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createIncompleteReport,
  createTechnician,
  createTicket,
  createWorkOrder,
  getIncompleteReports,
  getTechnicians,
  getTickets,
  getWorkOrders,
  updateTicket,
} from "@/lib/repository";
import { calculateSLACompliance, groupTicketsBySLAStatus } from "@/lib/sla";
import { IncompleteReport, Technician, TICKET_TYPE_META, Ticket, UserRole, UserSession, WorkOrder } from "@/types/domain";

interface AppContextType {
  user: UserSession | null;
  tickets: Ticket[];
  technicians: Technician[];
  workOrders: WorkOrder[];
  incompleteReports: IncompleteReport[];
  isReady: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  refreshData: () => Promise<void>;
  addTicket: (ticket: Omit<Ticket, "id" | "created_at">) => Promise<void>;
  editTicket: (id: string, payload: Partial<Ticket>) => Promise<void>;
  addTechnician: (technician: Omit<Technician, "id" | "created_at">) => Promise<void>;
  addWorkOrder: (data: Omit<WorkOrder, "id" | "submitted_at">) => Promise<void>;
  addIncompleteReport: (data: Omit<IncompleteReport, "id" | "reported_at">) => Promise<void>;
  // Métodos de filtrado por rol
  getVisibleTickets: () => Ticket[];
  getAvailableTickets: () => Ticket[];  // Tickets sin asignar (para que técnicos acepten)
  // Métodos de SLA
  getSLACompliance: () => ReturnType<typeof calculateSLACompliance>;
  getTicketsBySLAStatus: () => ReturnType<typeof groupTicketsBySLAStatus>;
}

const SESSION_KEY = "coordinatech_session";
const AppContext = createContext<AppContextType | undefined>(undefined);

function toId(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 100000)}`;
}

/** Genera el próximo ID correlativo: ST-001, INS-002, RT-003, etc. */
function nextTicketId(type: Ticket["ticket_type"], existing: Ticket[]): string {
  const prefix = TICKET_TYPE_META[type].prefix;
  const sameType = existing.filter((t) => t.id.startsWith(prefix + "-"));
  const next = sameType.length + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [incompleteReports, setIncompleteReports] = useState<IncompleteReport[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshData = useCallback(async () => {
    const [nextTickets, nextTechs, nextOrders, nextReports] = await Promise.all([
      getTickets(),
      getTechnicians(),
      getWorkOrders(),
      getIncompleteReports(),
    ]);
    setTickets(nextTickets);
    setTechnicians(nextTechs);
    setWorkOrders(nextOrders);
    setIncompleteReports(nextReports);
  }, []);

  // Cargar datos de Supabase (o fallback) al montar la app
  useEffect(() => {
    refreshData().finally(() => setIsReady(true));
  }, [refreshData]);

  // ── Polling automático cada 10 segundos para sincronizar datos en tiempo real ──
  useEffect(() => {
    if (!isReady) return;
    const intervalId = setInterval(() => {
      refreshData();
    }, 10000); // Cada 10 segundos

    return () => clearInterval(intervalId);
  }, [isReady, refreshData]);

  const login = useCallback(
    async (email: string, password: string, role: UserRole): Promise<boolean> => {
      if (role === "admin") {
        if (email === "maria.gonzalez@company.com" && password === "admin123") {
          const nextUser: UserSession = {
            id: "ADMIN-001",
            name: "Maria Gonzalez",
            email,
            role,
          };
          setUser(nextUser);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
          await refreshData();
          return true;
        }
        return false;
      }

      const allTechs = await getTechnicians();
      const tech = allTechs.find((item) => item.email === email && item.password === password);
      if (!tech) {
        return false;
      }

      const nextUser: UserSession = {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        role,
      };

      setUser(nextUser);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextUser));
      await refreshData();
      return true;
    },
    [refreshData],
  );

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  }, []);

  const addTicketHandler = useCallback(
    async (ticket: Omit<Ticket, "id" | "created_at">) => {
      try {
        const payload: Ticket = {
          ...ticket,
          id: nextTicketId(ticket.ticket_type, tickets),
          created_at: new Date().toISOString(),
        };
        await createTicket(payload);
        await refreshData();
      } catch (error) {
        console.error("Error al crear ticket:", error);
        // Recargar datos para sincronizar con servidor
        await refreshData();
        // Re-lanzar el error para que se maneje en la UI
        throw error;
      }
    },
    [refreshData, tickets],
  );

  const editTicketHandler = useCallback(
    async (id: string, payload: Partial<Ticket>) => {
      // Guardar estado anterior por si falla
      const prevTickets = tickets;
      
      // Actualización optimista: cambio local inmediato
      setTickets((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
      
      try {
        // Primero intenta via API con validación server-side (si está disponible)
        try {
          const response = await fetch(`/api/tickets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
          }

          // Si la API devuelve éxito, sincronizar datos y retornar
          await refreshData();
          return;
        } catch (apiError) {
          console.warn("API route no disponible, usando fallback:", apiError);
          // Fallback a la función original si API no está disponible
        }

        // Fallback: usar updateTicket directamente
        await updateTicket(id, payload);
        await refreshData();
      } catch (error) {
        console.error(`Error al actualizar ticket ${id}:`, error);
        
        // Revertir cambios locales si falla
        setTickets(prevTickets);
        
        // Recargar datos del servidor para sincronizar
        try {
          await refreshData();
        } catch (refetchError) {
          console.error("Error al sincronizar datos después del fallo:", refetchError);
        }
        
        // Re-lanzar el error para que lo maneje la UI
        throw error;
      }
    },
    [refreshData, tickets],
  );

  const addTechnicianHandler = useCallback(
    async (technician: Omit<Technician, "id" | "created_at">) => {
      const payload: Technician = {
        ...technician,
        id: toId("TECH"),
        created_at: new Date().toISOString(),
      };
      await createTechnician(payload);
      await refreshData();
    },
    [refreshData],
  );

  const addWorkOrderHandler = useCallback(
    async (data: Omit<WorkOrder, "id" | "submitted_at">) => {
      const payload: WorkOrder = {
        ...data,
        id: toId("ORD"),
        submitted_at: new Date().toISOString(),
      };
      await createWorkOrder(payload);
      setWorkOrders((prev) => [payload, ...prev]);
    },
    [],
  );

  const addIncompleteReportHandler = useCallback(
    async (data: Omit<IncompleteReport, "id" | "reported_at">) => {
      const payload: IncompleteReport = {
        ...data,
        id: toId("INC"),
        reported_at: new Date().toISOString(),
      };
      await createIncompleteReport(payload);
      setIncompleteReports((prev) => [payload, ...prev]);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      tickets,
      technicians,
      workOrders,
      incompleteReports,
      isReady,
      login,
      logout,
      refreshData,
      addTicket: addTicketHandler,
      editTicket: editTicketHandler,
      addTechnician: addTechnicianHandler,
      addWorkOrder: addWorkOrderHandler,
      addIncompleteReport: addIncompleteReportHandler,
      // Filtro por rol: admin ve todos, técnico solo sus tickets ACTIVOS
      getVisibleTickets: () => {
        if (!user) return [];
        if (user.role === "admin") return tickets;
        // Técnico ve solo sus tickets asignados y ACTIVOS (excluyendo completados/no completados)
        return tickets.filter((t) => t.technician_id === user.id && !["completed", "not_completed"].includes(t.status));
      },
      // Tickets sin asignar disponibles para que técnicos acepten (SOLO pending)
      getAvailableTickets: () => {
        if (!user || user.role === "admin") return [];
        // Tickets PENDING sin técnico asignado. Excluye not_completed del admin
        return tickets.filter((t) => (!t.technician_id || t.technician_id === "") && t.status === "pending");
      },
      // Cálculo de SLA
      getSLACompliance: () => calculateSLACompliance(tickets),
      getTicketsBySLAStatus: () => groupTicketsBySLAStatus(tickets),
    }),
    [
      user,
      tickets,
      technicians,
      workOrders,
      incompleteReports,
      isReady,
      login,
      logout,
      refreshData,
      addTicketHandler,
      editTicketHandler,
      addTechnicianHandler,
      addWorkOrderHandler,
      addIncompleteReportHandler,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
}

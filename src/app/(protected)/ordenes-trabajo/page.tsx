"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ClipboardList,
  FileText,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { PriorityPill, StatusPill } from "@/components/StatusPill";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useAppContext } from "@/context/AppContext";
import { Avatar } from "@/components/Avatar";
import { TICKET_TYPE_META, TicketType, WorkOrder } from "@/types/domain";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getSLA(scheduledDate: string, status: string) {
  if (status === "completed" || status === "not_completed") return null;
  const diffMs  = new Date(scheduledDate).getTime() - Date.now();
  const overdue = diffMs < 0;
  const totalH  = Math.abs(Math.floor(diffMs / 3_600_000));
  const mins    = Math.abs(Math.floor((diffMs % 3_600_000) / 60_000));
  const days    = Math.floor(totalH / 24);
  let label: string;
  if (overdue)          label = totalH >= 24 ? `${days}d vencido` : `${totalH}h vencido`;
  else if (totalH < 2)  label = `${totalH}h ${mins}m`;
  else if (totalH < 24) label = `${totalH}h`;
  else                  label = `${days}d ${totalH % 24}h`;
  const color  = overdue ? "#dc2626" : totalH < 24 ? "#d97706" : "#16a34a";
  const bg     = overdue ? "#fef2f2" : totalH < 24 ? "#fffbeb" : "#f0fdf4";
  const border = overdue ? "#fca5a5" : totalH < 24 ? "#fcd34d" : "#86efac";
  return { label, color, bg, border };
}

function StarRating({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} fill={n <= value ? "#f59e0b" : "none"} stroke={n <= value ? "#f59e0b" : "#d1d5db"} />
      ))}
    </div>
  );
}

// â”€â”€ Fila expandible de una orden completada â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WorkOrderRow({ order, ticketTitle, typeMeta }: {
  order: WorkOrder;
  ticketTitle: string;
  typeMeta: typeof TICKET_TYPE_META[TicketType];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr style={{ cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ padding: "0.1rem 0.35rem", borderRadius: "var(--r-sm)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", background: typeMeta.bg, color: typeMeta.color, border: `1px solid ${typeMeta.border}` }}>
              {typeMeta.prefix}
            </span>
            <span style={{ fontWeight: 600, fontSize: "0.84rem" }}>{order.ticket_id}</span>
          </div>
        </td>
        <td>
          <p style={{ margin: 0, fontWeight: 500, fontSize: "0.86rem" }}>{ticketTitle}</p>
          <p className="muted" style={{ fontSize: "0.73rem", margin: 0 }}>{order.cliente_local} â€” {order.cliente_direccion}</p>
        </td>
        <td className="table-hide-xs">
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Avatar name={order.tech_name} size={22} />
            <span style={{ fontSize: "0.8rem" }}>{order.tech_name}</span>
          </div>
        </td>
        <td className="table-hide-xs"><StarRating value={order.rating} /></td>
        <td className="table-hide-xs" style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
          {format(new Date(order.submitted_at), "dd MMM yyyy HH:mm", { locale: es })}
        </td>
        <td style={{ textAlign: "right" }}>
          {open ? <ChevronUp size={15} color="var(--muted)" /> : <ChevronDown size={15} color="var(--muted)" />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: 0, background: "var(--surface-alt)" }}>
            <div style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", border: "1px solid var(--line)" }}>
                  <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>Cliente</p>
                  <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "0.86rem" }}>{order.cliente_nombre}</p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>{order.cliente_local}</p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>{order.cliente_direccion}, {order.cliente_ciudad}</p>
                </div>
                <div style={{ background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", border: "1px solid var(--line)" }}>
                  <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>Quien recibe</p>
                  <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "0.86rem" }}>{order.recibe_nombre}</p>
                  <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>{order.recibe_cargo}</p>
                  <div style={{ marginTop: "0.4rem" }}><StarRating value={order.rating} /></div>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.73rem" }}>{order.razon_calificacion}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", border: "1px solid var(--line)" }}>
                  <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>ProblemÃ¡tica</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>{order.problematica}</p>
                </div>
                <div style={{ background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", border: "1px solid var(--line)" }}>
                  <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>SoluciÃ³n aplicada</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>{order.solucion}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.75rem", alignItems: "start" }}>
                <div style={{ background: "var(--surface)", borderRadius: "var(--r-sm)", padding: "0.75rem 1rem", border: "1px solid var(--line)" }}>
                  <p className="eyebrow" style={{ marginBottom: "0.35rem" }}>Pruebas realizadas</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", lineHeight: 1.5 }}>{order.pruebas}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  <span style={{ padding: "0.3rem 0.65rem", borderRadius: "var(--r-sm)", fontSize: "0.74rem", fontWeight: 600, background: order.reemplazo_equipo === "Si" ? "#fef2f2" : "#f0fdf4", color: order.reemplazo_equipo === "Si" ? "#b91c1c" : "#15803d", border: `1px solid ${order.reemplazo_equipo === "Si" ? "#fca5a5" : "#86efac"}`, whiteSpace: "nowrap" }}>
                    {order.reemplazo_equipo === "Si" ? "âš  ReemplazÃ³ equipo" : "âœ“ Sin reemplazo"}
                  </span>
                  {order.retira_equipo && (
                    <span style={{ padding: "0.3rem 0.65rem", borderRadius: "var(--r-sm)", fontSize: "0.74rem", fontWeight: 600, background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d", whiteSpace: "nowrap" }}>â¬† Retira equipo</span>
                  )}
                  {order.supervisor_nombre && (
                    <div style={{ padding: "0.3rem 0.65rem", borderRadius: "var(--r-sm)", fontSize: "0.72rem", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--muted)" }}>
                      <span style={{ display: "block", fontWeight: 600, color: "var(--ink)", marginBottom: 1 }}>Supervisor</span>
                      {order.supervisor_nombre}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Link href={`/tickets/${order.ticket_id}`} style={{ fontSize: "0.8rem", color: "var(--brand)", fontWeight: 500, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                  Ver ticket completo â†’
                </Link>
              </div>              {order.documents && order.documents.length > 0 && (
                <>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
                    <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)" }}>
                      📎 Documentos Adjuntos ({order.documents.length})
                    </p>
                    <DocumentViewer documents={order.documents} />
                  </div>
                </>
              )}            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// â”€â”€ Filtros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_FILTERS = [
  { value: "all",           label: "Todas"          },
  { value: "pending",       label: "Nuevas"         },
  { value: "assigned",      label: "Asignadas"      },
  { value: "in_progress",   label: "En progreso"    },
  { value: "completed",     label: "Completadas"    },
  { value: "not_completed", label: "No completadas" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
const TYPE_FILTERS: { value: "all" | TicketType; label: string }[] = [
  { value: "all",         label: "Todos los tipos" },
  { value: "support",     label: "ST â€” Soporte"     },
  { value: "installation",label: "INS â€” InstalaciÃ³n" },
  { value: "removal",     label: "RT â€” Retiro"      },
];

export default function OrdenesTrabajoPage() {
  const { tickets, technicians, workOrders, user } = useAppContext();

  const [tab, setTab]                    = useState<"ordenes" | "tickets">("ordenes");
  const [query, setQuery]                = useState("");
  const [statusFilter, setStatusFilter]  = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter]      = useState<"all" | TicketType>("all");

  if (user?.role !== "admin") {
    return <section className="panel"><p className="muted">Acceso restringido.</p></section>;
  }

  // â”€â”€ Filtrado de Ã³rdenes completadas â”€â”€
  const filteredOrders = useMemo(() => {
    const q = query.toLowerCase().trim();
    return workOrders.filter((o) => {
      const ticket = tickets.find((t) => t.id === o.ticket_id);
      const matchQ =
        !q ||
        o.ticket_id.toLowerCase().includes(q) ||
        o.tech_name.toLowerCase().includes(q) ||
        o.cliente_nombre.toLowerCase().includes(q) ||
        o.cliente_local.toLowerCase().includes(q) ||
        ticket?.title.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || ticket?.ticket_type === typeFilter;
      return matchQ && matchType;
    });
  }, [workOrders, tickets, query, typeFilter]);

  // â”€â”€ Filtrado de tickets â”€â”€
  const filteredTickets = useMemo(() => {
    const q = query.toLowerCase().trim();
    return tickets.filter((t) => {
      const tech = technicians.find((tc) => tc.id === t.technician_id);
      const matchQ =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q) ||
        tech?.name.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchType   = typeFilter   === "all" || t.ticket_type === typeFilter;
      return matchQ && matchStatus && matchType;
    });
  }, [tickets, technicians, query, statusFilter, typeFilter]);

  // â”€â”€ Resumen por tipo â”€â”€
  const summary = useMemo(() => {
    return (["support", "installation", "removal"] as TicketType[]).map((type) => {
      const ofType = tickets.filter((t) => t.ticket_type === type);
      const ords   = workOrders.filter((o) => tickets.find((t) => t.id === o.ticket_id)?.ticket_type === type);
      return { type, total: ofType.length, completed: ofType.filter((t) => t.status === "completed").length, orders: ords.length };
    });
  }, [tickets, workOrders]);

  const clearQuery = () => setQuery("");

  return (
    <div className="stack-lg">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="row-between" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 style={{ marginBottom: 0 }}>Ã“rdenes de Trabajo</h2>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            {workOrders.length} orden{workOrders.length !== 1 ? "es" : ""} completada{workOrders.length !== 1 ? "s" : ""} Â· {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} en sistema
          </p>
        </div>
        <Link href="/tickets/new" className="primary-btn">
          <Plus size={14} /> Nueva orden
        </Link>
      </div>

      {/* â”€â”€ Resumen cards â”€â”€ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        {summary.map(({ type, total, completed, orders }) => {
          const meta = TICKET_TYPE_META[type];
          return (
            <div key={type} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: "var(--r-md)", padding: "0.9rem 1rem", cursor: "pointer", outline: typeFilter === type ? `2px solid ${meta.color}` : "none" }}
              onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.08em", color: meta.color, background: "white", border: `1px solid ${meta.border}`, padding: "0.15rem 0.45rem", borderRadius: "var(--r-sm)" }}>{meta.prefix}</span>
                <span style={{ fontWeight: 700, fontSize: "1.35rem", color: meta.color }}>{total}</span>
              </div>
              <p style={{ margin: "0 0 0.3rem", fontSize: "0.78rem", fontWeight: 600, color: meta.color }}>{meta.label}</p>
              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: meta.color, opacity: 0.8 }}>
                <span>Completados: {completed}</span>
                <span style={{ fontWeight: orders > 0 ? 700 : 400, display: "flex", alignItems: "center", gap: 3 }}>
                  <CheckCircle2 size={9} /> Ã“rdenes: {orders}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* â”€â”€ Tabs â”€â”€ */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
        {[
          { key: "ordenes", label: "Ã“rdenes completadas", icon: FileText,     count: workOrders.length },
          { key: "tickets", label: "Todos los tickets",   icon: ClipboardList, count: tickets.length   },
        ].map(({ key, label, icon: Icon, count }) => (
          <button key={key} type="button" onClick={() => setTab(key as "ordenes" | "tickets")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.6rem 1.1rem", fontSize: "0.84rem", fontWeight: tab === key ? 700 : 400, border: "none", borderBottom: tab === key ? "2px solid var(--brand)" : "2px solid transparent", background: "none", cursor: "pointer", color: tab === key ? "var(--brand)" : "var(--muted)", marginBottom: "-1px" }}>
            <Icon size={14} /> {label}
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 18, padding: "0 5px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: tab === key ? "var(--brand)" : "var(--line)", color: tab === key ? "#fff" : "var(--muted)" }}>{count}</span>
          </button>
        ))}
      </div>

      <section className="panel" style={{ paddingTop: "1rem" }}>
        {/* â”€â”€ Buscador â”€â”€ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "0.65rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "ordenes" ? "Buscar por ID ticket, tÃ©cnico, cliente, localâ€¦" : "Buscar por ID (ST-001), tÃ­tulo, direcciÃ³n o tÃ©cnicoâ€¦"}
              style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 2.25rem 0.5rem 2rem", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "0.84rem", background: "var(--surface)", color: "var(--ink)" }} />
            {query && (
              <button type="button" onClick={clearQuery} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
          {tab === "tickets" && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {STATUS_FILTERS.map((f) => (
                <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.76rem", fontWeight: statusFilter === f.value ? 700 : 400, borderRadius: "var(--r-sm)", border: `1px solid ${statusFilter === f.value ? "var(--brand)" : "var(--line)"}`, background: statusFilter === f.value ? "var(--brand-dim)" : "var(--surface)", color: statusFilter === f.value ? "var(--brand)" : "var(--muted)", cursor: "pointer" }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* â•â• TAB: Ã“RDENES COMPLETADAS â•â• */}
        {tab === "ordenes" && (
          <div className="table-wrap">
            {filteredOrders.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <FileText size={36} color="var(--muted)" style={{ marginBottom: "0.75rem", display: "block", margin: "0 auto 0.75rem" }} />
                <p className="muted" style={{ marginBottom: "0.5rem" }}>
                  {workOrders.length === 0
                    ? "AÃºn no se han enviado Ã³rdenes. AparecerÃ¡n aquÃ­ cuando un tÃ©cnico complete el formulario de soporte."
                    : "No se encontraron Ã³rdenes con los filtros actuales."}
                </p>
                {(query || typeFilter !== "all") && (
                  <button type="button" className="outline-btn" style={{ fontSize: "0.8rem" }} onClick={() => { clearQuery(); setTypeFilter("all"); }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>TÃ­tulo / Local</th>
                    <th className="table-hide-xs">TÃ©cnico</th>
                    <th className="table-hide-xs">CalificaciÃ³n</th>
                    <th className="table-hide-xs">Enviado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const ticket   = tickets.find((t) => t.id === order.ticket_id);
                    const typeMeta = TICKET_TYPE_META[(ticket?.ticket_type ?? "support") as TicketType];
                    return (
                      <WorkOrderRow key={order.id} order={order} ticketTitle={ticket?.title ?? order.ticket_id} typeMeta={typeMeta} />
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* â•â• TAB: TODOS LOS TICKETS â•â• */}
        {tab === "tickets" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID Orden</th>
                  <th>TÃ­tulo / DirecciÃ³n</th>
                  <th className="table-hide-xs">TÃ©cnico</th>
                  <th>Estado</th>
                  <th className="table-hide-xs">Prioridad</th>
                  <th className="table-hide-xs">SLA</th>
                  <th className="table-hide-xs">Programado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => {
                  const tech     = technicians.find((tc) => tc.id === ticket.technician_id);
                  const sla      = getSLA(ticket.scheduled_date, ticket.status);
                  const typeMeta = TICKET_TYPE_META[ticket.ticket_type ?? "support"];
                  const hasOrder = workOrders.some((o) => o.ticket_id === ticket.id);
                  return (
                    <tr key={ticket.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ padding: "0.1rem 0.35rem", borderRadius: "var(--r-sm)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", background: typeMeta.bg, color: typeMeta.color, border: `1px solid ${typeMeta.border}` }}>{typeMeta.prefix}</span>
                          <span style={{ fontWeight: 600, fontSize: "0.84rem" }}>{ticket.id}</span>
                          {hasOrder && <span title="Orden completada"><CheckCircle2 size={12} color="#16a34a" /></span>}
                        </div>
                      </td>
                      <td>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: "0.86rem" }}>{ticket.title}</p>
                        <p className="muted" style={{ fontSize: "0.74rem", margin: 0 }}>{ticket.address}</p>
                      </td>
                      <td className="table-hide-xs">
                        {tech ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Avatar name={tech.name} size={22} />
                            <span style={{ fontSize: "0.8rem" }}>{tech.name}</span>
                          </div>
                        ) : <span className="muted" style={{ fontSize: "0.8rem" }}>Sin asignar</span>}
                      </td>
                      <td><StatusPill status={ticket.status} /></td>
                      <td className="table-hide-xs"><PriorityPill priority={ticket.priority} /></td>
                      <td className="table-hide-xs">
                        {sla ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.18rem 0.5rem", borderRadius: "var(--r-sm)", background: sla.bg, color: sla.color, border: `1px solid ${sla.border}`, fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <Clock size={10} /> {sla.label}
                          </span>
                        ) : <span className="muted" style={{ fontSize: "0.74rem" }}>â€”</span>}
                      </td>
                      <td className="table-hide-xs" style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                        {format(new Date(ticket.scheduled_date), "dd MMM yyyy HH:mm", { locale: es })}
                      </td>
                      <td>
                        <Link href={`/tickets/${ticket.id}`} style={{ fontSize: "0.8rem", color: "var(--brand)", fontWeight: 500, textDecoration: "none" }}>Ver â†’</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p className="muted">No se encontraron tickets con los filtros actuales.</p>
                <button type="button" className="outline-btn" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}
                  onClick={() => { clearQuery(); setStatusFilter("all"); setTypeFilter("all"); }}>
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

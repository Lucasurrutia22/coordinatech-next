"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { TicketStatus } from "@/types/domain";

const S: Record<TicketStatus, { bg: string; fg: string; border: string; dot: string; label: string }> = {
  pending:       { bg: "#fffbeb", fg: "#92400e", border: "#fde68a", dot: "#f59e0b", label: "Pendiente"      },
  assigned:      { bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6", label: "Asignado"       },
  in_progress:   { bg: "#f0f9ff", fg: "#0369a1", border: "#bae6fd", dot: "#0ea5e9", label: "En progreso"    },
  completed:     { bg: "#f0fdf4", fg: "#166534", border: "#bbf7d0", dot: "#22c55e", label: "Completado"     },
  not_completed: { bg: "#fff1f2", fg: "#9f1239", border: "#fda4af", dot: "#f43f5e", label: "No completado"  },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function parseLocalDate(dateStr: string) {
  if (!dateStr) return new Date(NaN);
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}

export default function CalendarPage() {
  const { tickets, technicians, user } = useAppContext();
  const [current, setCurrent]   = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const ticketsInMonth  = tickets.filter((t) => isSameMonth(parseLocalDate(t.scheduled_date), current));
  const ticketsForDay   = (day: Date) => tickets.filter((t) => isSameDay(parseLocalDate(t.scheduled_date), day));
  const unassigned      = tickets.filter((t) => t.status === "pending");
  const today           = new Date();

  const upcoming = [...tickets]
    .filter((t) => parseLocalDate(t.scheduled_date) >= new Date(today.setHours(0, 0, 0, 0)))
    .sort((a, b) => parseLocalDate(a.scheduled_date).getTime() - parseLocalDate(b.scheduled_date).getTime())
    .slice(0, 8);

  const selectedTickets = selected ? ticketsForDay(selected) : [];

  /* ─── stat counts for this month ─── */
  const counts = (Object.keys(S) as TicketStatus[]).map((status) => ({
    status,
    count: ticketsInMonth.filter((t) => t.status === status).length,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Top stat bar ─────────────────────────── */}
      <div className="grid-metrics" style={{ gap: "0.75rem" }}>
        {counts.map(({ status, count }) => {
          const c = S[status];
          return (
            <div key={status} style={{
              background: "var(--surface)",
              border: `1px solid var(--line)`,
              borderTop: `3px solid ${c.dot}`,
              borderRadius: "var(--r-md)",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-xs)",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {c.label}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1, letterSpacing: "-0.03em" }}>
                  {count}
                </p>
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: "var(--r-sm)",
                background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: c.dot }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main area ──────────────────────────────── */}
      <div className="cal-main-grid">

        {/* ── Calendar card ── */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
          }}>
            {/* Left: month + nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setCurrent(subMonths(current, 1))}
                aria-label="Mes anterior"
                style={{
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
                  background: "transparent", cursor: "pointer", color: "var(--muted)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronLeft size={16} />
              </button>

              <div style={{ textAlign: "center", minWidth: 160 }}>
                <h2 style={{
                  margin: 0, fontSize: "1.05rem", fontWeight: 700,
                  color: "var(--ink)", letterSpacing: "-0.01em",
                  textTransform: "capitalize",
                }}>
                  {format(current, "MMMM", { locale: es })}
                </h2>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500 }}>
                  {format(current, "yyyy")}
                </p>
              </div>

              <button
                onClick={() => setCurrent(addMonths(current, 1))}
                aria-label="Mes siguiente"
                style={{
                  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
                  background: "transparent", cursor: "pointer", color: "var(--muted)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Right: today + new */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => { setCurrent(new Date()); setSelected(null); }}
                style={{
                  padding: "0.38rem 0.9rem", fontSize: "0.8rem", fontWeight: 500,
                  border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
                  background: "var(--surface)", cursor: "pointer", color: "var(--ink)",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                Hoy
              </button>
              {user?.role === "admin" && (
                <Link
                  href="/tickets/new"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "0.38rem 0.9rem", fontSize: "0.8rem", fontWeight: 600,
                    background: "var(--primary)", color: "#fff",
                    borderRadius: "var(--r-sm)", textDecoration: "none",
                    transition: "opacity 0.12s",
                  }}
                >
                  <Plus size={14} strokeWidth={2.5} /> Nuevo ticket
                </Link>
              )}
            </div>
          </div>

          {/* Weekday header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
          }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                padding: "0.5rem 0",
                textAlign: "center",
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: i >= 5 ? "var(--brand-secondary)" : "var(--muted)",
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {days.map((day, i) => {
              const dayTickets     = ticketsForDay(day);
              const inMonth        = isSameMonth(day, current);
              const isTodayCell    = isToday(day);
              const isSelectedCell = selected ? isSameDay(day, selected) : false;
              const isWeekend      = i % 7 >= 5;
              const showBorderB    = i < days.length - 7;
              const showBorderR    = (i + 1) % 7 !== 0;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelected(isSelectedCell ? null : day)}
                  style={{
                    minHeight: 110,
                    padding: "8px 7px 6px",
                    borderBottom: showBorderB ? "1px solid var(--line)" : "none",
                    borderRight:  showBorderR ? "1px solid var(--line)" : "none",
                    background: isSelectedCell
                      ? "rgba(16,185,129,.06)"
                      : isWeekend && inMonth
                      ? "rgba(0,0,0,.012)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelectedCell) e.currentTarget.style.background = "rgba(0,0,0,.025)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isSelectedCell
                      ? "rgba(16,185,129,.06)"
                      : isWeekend && inMonth
                      ? "rgba(0,0,0,.012)"
                      : "transparent";
                  }}
                >
                  {/* Top-right: selected ring indicator */}
                  {isSelectedCell && (
                    <div style={{
                      position: "absolute", top: 4, right: 4,
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--brand)",
                    }} />
                  )}

                  {/* Day number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 5,
                    fontSize: "0.82rem",
                    fontWeight: isTodayCell ? 700 : inMonth ? 400 : 300,
                    background: isTodayCell ? "var(--primary)" : "transparent",
                    color: isTodayCell
                      ? "#fff"
                      : !inMonth
                      ? "var(--line)"
                      : isWeekend
                      ? "var(--brand-secondary)"
                      : "var(--ink)",
                    boxShadow: isTodayCell ? "0 2px 8px rgba(0,14,23,.35)" : "none",
                  }}>
                    {format(day, "d")}
                  </div>

                  {/* Event chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayTickets.slice(0, 3).map((ticket) => {
                      const c = S[ticket.status];
                      return (
                        <Link
                          key={ticket.id}
                          href={`/tickets/${ticket.id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "block",
                            background: c.bg,
                            color: c.fg,
                            borderLeft: `2.5px solid ${c.dot}`,
                            borderRadius: "4px",
                            padding: "2px 5px",
                            fontSize: "0.67rem",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textDecoration: "none",
                            lineHeight: "16px",
                            letterSpacing: "0.01em",
                          }}
                        >
                          {ticket.title}
                        </Link>
                      );
                    })}
                    {dayTickets.length > 3 && (
                      <span style={{
                        fontSize: "0.63rem", color: "var(--muted)", fontWeight: 600,
                        paddingLeft: 4,
                      }}>
                        +{dayTickets.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer legend */}
          <div style={{
            padding: "0.65rem 1.25rem",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 20,
            background: "var(--surface-2)",
          }}>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 500 }}>
              {ticketsInMonth.length} evento{ticketsInMonth.length !== 1 ? "s" : ""} este mes
            </span>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {(Object.entries(S) as [TicketStatus, typeof S[TicketStatus]][]).map(([, c]) => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.dot }} />
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 500 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

          {/* Selected day */}
          {selected && (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--brand)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
              boxShadow: "0 0 0 3px rgba(16,185,129,.1)",
            }}>
              <div style={{
                padding: "0.65rem 0.85rem",
                background: "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
                  {format(selected, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <span style={{
                  background: "rgba(255,255,255,.15)", color: "#fff",
                  borderRadius: "var(--r-full)", padding: "1px 8px",
                  fontSize: "0.68rem", fontWeight: 600,
                }}>
                  {selectedTickets.length}
                </span>
              </div>
              <div style={{ padding: "0.65rem" }}>
                {selectedTickets.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted-2)", fontSize: "0.8rem", textAlign: "center", padding: "0.75rem 0" }}>
                    Sin eventos este día
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {selectedTickets.map((t) => {
                      const c = S[t.status];
                      return (
                        <Link key={t.id} href={`/tickets/${t.id}`} style={{ textDecoration: "none" }}>
                          <div style={{
                            padding: "0.5rem 0.65rem",
                            border: `1px solid ${c.border}`,
                            borderLeft: `3px solid ${c.dot}`,
                            borderRadius: "var(--r-sm)",
                            background: c.bg,
                            transition: "opacity 0.1s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                          >
                            <p style={{ margin: "0 0 2px", fontSize: "0.8rem", fontWeight: 600, color: "var(--ink)" }}>{t.title}</p>
                            <p style={{ margin: 0, fontSize: "0.7rem", color: c.fg, display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={9} />{t.address}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unassigned tickets — solo admin */}
          {user?.role === "admin" && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-xs)",
          }}>
            <div style={{
              padding: "0.65rem 0.9rem",
              borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--surface-2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <UserCheck size={14} color="var(--muted)" />
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>Sin Asignar</span>
              </div>
              <span style={{
                background: unassigned.length > 0 ? S.pending.bg : "var(--surface-high)",
                color: unassigned.length > 0 ? S.pending.fg : "var(--muted)",
                border: `1px solid ${unassigned.length > 0 ? S.pending.border : "var(--line)"}`,
                borderRadius: "var(--r-full)", padding: "1px 8px",
                fontSize: "0.68rem", fontWeight: 700,
              }}>
                {unassigned.length}
              </span>
            </div>
            <div style={{ padding: "0.6rem", display: "flex", flexDirection: "column", gap: 5 }}>
              {unassigned.slice(0, 4).map((t) => (
                <div key={t.id} style={{
                  padding: "0.55rem 0.65rem",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--surface-2)",
                }}>
                  <p style={{ margin: "0 0 1px", fontSize: "0.79rem", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.title}
                  </p>
                  <p style={{ margin: "0 0 7px", fontSize: "0.68rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={9} />
                    {format(parseLocalDate(t.scheduled_date), "d MMM", { locale: es })} · {t.address}
                  </p>
                  <Link href={`/tickets/${t.id}/edit`} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: "0.68rem", fontWeight: 700, color: "var(--brand-secondary)",
                    border: "1px solid var(--brand-secondary)", borderRadius: "var(--r-xs)",
                    padding: "2px 9px", textDecoration: "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-dim)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Asignar →
                  </Link>
                </div>
              ))}
              {unassigned.length === 0 && (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.78rem", textAlign: "center", padding: "0.6rem 0" }}>
                  Todo asignado ✓
                </p>
              )}
            </div>
          </div>
          )}

          {/* Upcoming events */}
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-xs)",
          }}>
            <div style={{
              padding: "0.65rem 0.9rem",
              borderBottom: "1px solid var(--line)",
              background: "var(--surface-2)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Clock size={14} color="var(--muted)" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>Próximos eventos</span>
            </div>
            <div style={{ padding: "0.4rem 0.5rem", display: "flex", flexDirection: "column" }}>
              {upcoming.map((t) => {
                const tech = technicians.find((x) => x.id === t.technician_id);
                const c    = S[t.status];
                return (
                  <Link key={t.id} href={`/tickets/${t.id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 9,
                        padding: "0.5rem 0.4rem", borderRadius: "var(--r-xs)",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Date block */}
                      <div style={{
                        width: 36, flexShrink: 0, textAlign: "center",
                        background: c.bg,
                        border: `1px solid ${c.border}`,
                        borderRadius: "var(--r-sm)",
                        padding: "2px 0",
                      }}>
                        <p style={{ margin: 0, fontSize: "0.62rem", fontWeight: 700, color: c.fg, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {format(parseLocalDate(t.scheduled_date), "MMM", { locale: es })}
                        </p>
                        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: c.dot, lineHeight: "1.1" }}>
                          {format(parseLocalDate(t.scheduled_date), "d")}
                        </p>
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.title}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.67rem", color: "var(--muted)" }}>
                          {tech?.name ?? "Sin técnico"}
                        </p>
                      </div>
                      {/* Status dot */}
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
                    </div>
                  </Link>
                );
              })}
              {upcoming.length === 0 && (
                <p style={{ margin: "0.5rem 0", color: "var(--muted)", fontSize: "0.78rem", textAlign: "center" }}>
                  Sin eventos próximos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

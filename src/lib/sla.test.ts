/**
 * Pruebas unitarias del motor de SLA.
 * Trazabilidad con el Informe Final (Tabla 24): CP-01 (ST) y CP-02 (INS), más RT.
 *
 * Nota: los umbrales de semaforización del informe (amarilla al 70 % consumido,
 * roja sobre el 85 %) aún NO coinciden con SLA_CONFIG (warning al 50 % consumido,
 * critical al 75 %). Ver docs/proyecto-titulo/BRECHAS.md, brecha B-01.
 * Estas pruebas fijan el comportamiento actual; al alinear los umbrales se
 * deben actualizar junto con SLA_CONFIG.
 */
import { calculateSLACompliance, calculateSLAMetrics, enrichTicketWithSLA } from "@/lib/sla";
import type { Ticket, TicketType } from "@/types/domain";

const CREATED_AT = "2026-11-02T12:00:00.000Z";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "t-1",
    ticket_type: "support",
    title: "Tótem fuera de servicio",
    description: "",
    address: "Santiago",
    status: "in_progress",
    priority: "high",
    scheduled_date: CREATED_AT,
    technician_id: "tech-1",
    created_at: CREATED_AT,
    ...overrides,
  };
}

function at(minutesAfterCreation: number) {
  jest.setSystemTime(new Date(Date.parse(CREATED_AT) + minutesAfterCreation * 60_000));
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("ventana de SLA por tipología (regla de negocio ST 2h / INS 5h / RT 3h)", () => {
  it.each<[TicketType, number]>([
    ["support", 120], // CP-01: sla_limite_horas = 2
    ["installation", 300], // CP-02: sla_limite_horas = 5
    ["removal", 180],
  ])("%s → %i minutos", (ticket_type, minutes) => {
    at(0);
    const enriched = enrichTicketWithSLA(makeTicket({ ticket_type }));
    expect(Date.parse(enriched.sla_deadline!) - Date.parse(CREATED_AT)).toBe(minutes * 60_000);
    expect(calculateSLAMetrics(enriched).timeWindowMinutes).toBe(minutes);
  });

  it("usa ST como tipología por defecto si el tipo no es válido", () => {
    at(0);
    const metrics = calculateSLAMetrics(makeTicket({ ticket_type: "desconocido" as TicketType }));
    expect(metrics.timeWindowMinutes).toBe(120);
  });

  it("respeta el sla_deadline persistido (el compromiso no cambia retroactivamente)", () => {
    at(0);
    const deadline = new Date(Date.parse(CREATED_AT) + 999 * 60_000).toISOString();
    const enriched = enrichTicketWithSLA(makeTicket({ sla_deadline: deadline }));
    expect(enriched.sla_deadline).toBe(deadline);
  });
});

describe("semaforización de un ticket ST abierto (comportamiento actual)", () => {
  it.each<[number, string]>([
    [0, "ok"],
    [59, "ok"],
    [61, "warning"], // > 50 % consumido
    [91, "critical"], // > 75 % consumido
    [121, "overdue"],
  ])("a los %i min → %s", (minute, level) => {
    at(minute);
    expect(calculateSLAMetrics(makeTicket()).level).toBe(level);
  });
});

describe("tickets cerrados", () => {
  it("completado dentro de plazo → completed", () => {
    at(200);
    const t = makeTicket({ status: "completed", work_ended_at: "2026-11-02T13:30:00.000Z" });
    expect(calculateSLAMetrics(enrichTicketWithSLA(t)).level).toBe("completed");
  });

  it("completado fuera de plazo → overdue", () => {
    at(200);
    const t = makeTicket({ status: "completed", work_ended_at: "2026-11-02T14:30:00.000Z" });
    expect(calculateSLAMetrics(enrichTicketWithSLA(t)).level).toBe("overdue");
  });

  it("not_completed siempre cuenta como incumplimiento", () => {
    at(10);
    expect(calculateSLAMetrics(makeTicket({ status: "not_completed" })).isOverdue).toBe(true);
  });
});

describe("KPI-01: tasa de cumplimiento de SLA", () => {
  it("solo considera tickets cerrados y penaliza not_completed", () => {
    at(300);
    const tickets = [
      makeTicket({ id: "a", status: "completed", work_ended_at: "2026-11-02T13:00:00.000Z" }),
      makeTicket({ id: "b", status: "completed", work_ended_at: "2026-11-02T15:00:00.000Z" }),
      makeTicket({ id: "c", status: "not_completed" }),
      makeTicket({ id: "d", status: "in_progress" }),
    ].map(enrichTicketWithSLA);
    const result = calculateSLACompliance(tickets);
    expect(result.total).toBe(3);
    expect(result.compliant).toBe(1);
    expect(result.percentage).toBe(33);
  });

  it("sin tickets cerrados reporta 100 %", () => {
    expect(calculateSLACompliance([]).percentage).toBe(100);
  });
});

# 📊 Sistema SLA Profesional - Documentación Técnica

## Descripción General

El sistema de SLA (Service Level Agreement) ha sido rediseñado para proporcionar:
- Mediciones profesionales y claras
- Vistas diferenciadas para Admin y Técnico
- Alertas automáticas en tiempo real
- Visualización intuitiva del tiempo restante

## 🎯 Configuración de SLA

### Tiempos por Prioridad

```
PRIORIDAD     | VENTANA TIEMPO | ALERTA (Warning) | CRÍTICO | VENCIMIENTO
─────────────────────────────────────────────────────────────────────
🔴 CRÍTICA    | 4 horas        | 25% (1h)         | 10%    | 30min
🟠 ALTA       | 24 horas       | 25% (6h)         | 10%    | 2.4h
🟡 MEDIA      | 48 horas       | 25% (12h)        | 10%    | 4.8h
🟢 BAJA       | 72 horas       | 25% (18h)        | 10%    | 7.2h
```

### Estados SLA

1. **🟢 OK** (Verde)
   - Más del 50% de tiempo restante
   - Todo va bien, mantén el ritmo

2. **🟡 WARNING** (Amarillo)
   - 20-50% de tiempo restante
   - Alerta: acelera el proceso

3. **🔴 CRITICAL** (Rojo)
   - Menos del 20% de tiempo restante
   - ⚠️ Acción inmediata requerida

4. **❌ OVERDUE** (Oscuro)
   - Tiempo ya vencido
   - SLA NO cumplido

5. **✅ COMPLETED** (Verde oscuro)
   - Ticket cerrado dentro del plazo

## 📊 Vistas por Rol

### 1️⃣ Vista Admin: Dashboard SLA

**Ubicación:** Dashboard administrativo

**Componentes:**
```
┌─────────────────────────────────────┐
│ 📊 DASHBOARD SLA                    │
├─────────────────────────────────────┤
│ KPIs PRINCIPALES:                  │
│ ├─ Cumplimiento SLA: 87% ✓         │
│ ├─ Críticos: 3 🚨                  │
│ ├─ En Progreso: 12 ⏳              │
│ └─ Completados: 45 ✓               │
├─────────────────────────────────────┤
│ TICKETS CRÍTICOS (Top 5):           │
│ ├─ [🔴] Ticket A - 5% restante     │
│ ├─ [🔴] Ticket B - 8% restante     │
│ └─ [❌] Ticket C - VENCIDO          │
├─────────────────────────────────────┤
│ DISTRIBUCIÓN:                       │
│ ├─ ✓ En Tiempo: 12                 │
│ ├─ ⚠ Alerta: 4                     │
│ └─ 🔴 Crítico: 3                   │
└─────────────────────────────────────┘
```

**Características:**
- Vista en tiempo real de cumplimiento
- Alertas inmediatas de tickets críticos
- Tendencias de SLA por período
- Análisis por prioridad
- Exportación de reportes

### 2️⃣ Vista Técnico: Mi SLA

**Ubicación:** Panel de técnico / Mis Tickets

**Componentes:**
```
┌─────────────────────────────────────┐
│ 📋 MIS TICKETS ACTIVOS               │
├─────────────────────────────────────┤
│ RESUMEN: 5 Activos | 2 Críticos    │
├─────────────────────────────────────┤
│                                      │
│ TICKET: Reparación Router            │
│ Cliente: ABC Company                │
│ Estado: En Progreso 🔵              │
│                                      │
│ ┌──────────────────────────────┐    │
│ │ 🔴 CRITICAL - 12% Restante  │    │
│ │ ████████░░░░░░░░░░░░░░░░   │    │
│ │                              │    │
│ │ Estado: CRÍTICO              │    │
│ │ Vencimiento: Hoy 14:30 CET   │    │
│ └──────────────────────────────┘    │
│                                      │
│ Prioridad: 🔴 ALTA                  │
│ [⚡ Actuar Ahora] [Ver Detalles]   │
└─────────────────────────────────────┘
```

**Características:**
- Resumen de tickets activos
- Alerta visual de críticos
- Barra de progreso SLA clara
- Tiempo exacto de vencimiento
- Acciones rápidas (Actuar Ahora / Detalles)
- Tips de productividad

## 🔧 Implementación Técnica

### Archivos Principales

1. **`src/lib/slaMetrics.ts`**
   - Cálculos centralizados de SLA
   - Exporta: `calculateSLAMetrics()`, `calculateSLACompliance()`, etc.
   
2. **`src/components/SLAVisualizer.tsx`**
   - Componentes de visualización reutilizables
   - `SLATimelineBar` - Barra de progreso profesional
   - `SLABadgeCompact` - Badge compacto de estado

3. **`src/components/AdminSLADashboard.tsx`**
   - Dashboard completo para administradores
   - KPIs, alertas y distribución

4. **`src/components/TechnicianSLAView.tsx`**
   - Vista detallada para técnicos
   - Lista de tickets con SLA individual

### Cálculo de SLA

```typescript
const metrics = calculateSLAMetrics(ticket);

// Retorna:
{
  level: "critical" | "warning" | "ok" | "overdue" | "completed",
  percentRemaining: 45,           // % de tiempo restante
  timeRemaining: {
    days: 0,
    hours: 2,
    minutes: 15
  },
  deadline: Date,                 // Fecha/hora exacta
  hoursRemaining: 2.25,
  isOverdue: false,
  message: "🚨 45% tiempo restante",
  displayColor: "#ef4444",        // Color para visualización
  displayIcon: "🔴"               // Emoji para rápida identificación
}
```

## 📈 Cumplimiento y Reportes

### Cálculo de Cumplimiento

```typescript
const compliance = calculateSLACompliance(tickets);

// Retorna:
{
  total: 50,              // Total de tickets completados
  compliant: 43,          // Completados en tiempo
  percentage: 86,         // % de cumplimiento
  critical: 2,            // Tickets que vencieron
  warning: 5              // Tickets en alerta
}
```

**Métrica de Éxito:**
- ✅ >95% = Excelente
- ⚠️ 80-94% = Bueno
- 🔴 <80% = Requiere mejora

## 🚨 Alertas Automáticas

### Triggers de Alerta

| Evento | Trigger | Acción |
|--------|---------|--------|
| Crítico Nuevo | Ticket entra en CRITICAL | Notificar admin |
| Vencimiento | Ticket OVERDUE | Alerta inmediata |
| Warning | Ticket entra en WARNING | Notificar técnico |
| Compliant | Ticket completado OK | Registrar éxito |

## 💡 Mejores Prácticas

### Para Administradores

1. **Monitorea diariamente** el dashboard de SLA
2. **Reasigna tickets** críticos a técnicos disponibles
3. **Comunica** retrasos esperados a clientes
4. **Analiza tendencias** para mejorar procesos
5. **Celebra logros** de cumplimiento

### Para Técnicos

1. **Revisa alertas** al iniciar el día
2. **Prioriza** tickets críticos 🔴
3. **Actualiza estado** regularmente
4. **Comunica bloques** que afecten SLA
5. **Documenta** trabajo completado

## 📱 Integración en Vistas

### Admin - Usar AdminSLADashboard

```tsx
import { AdminSLADashboard } from "@/components/AdminSLADashboard";

export function AdminPage() {
  return <AdminSLADashboard />;
}
```

### Técnico - Usar TechnicianSLAView

```tsx
import { TechnicianSLAView } from "@/components/TechnicianSLAView";

export function MyTicketsPage() {
  const { tickets } = useAppContext();
  return <TechnicianSLAView tickets={tickets} />;
}
```

## 🎨 Código de Colores

| Color | Significado | Hex |
|-------|-------------|-----|
| 🟢 Verde | OK / Completado | #10b981 |
| 🟡 Amarillo | Alerta / Warning | #f59e0b |
| 🔴 Rojo | Crítico | #ef4444 |
| ⚫ Negro | Vencido | #7f1d1d |
| 🔵 Azul | En Progreso | #3b82f6 |

## 📊 Ejemplos de Uso

### Calcular SLA de un ticket

```typescript
import { calculateSLAMetrics } from "@/lib/slaMetrics";

const ticket = {
  id: "1",
  title: "Reparar servidor",
  priority: "high",
  created_at: "2026-06-21T10:00:00",
  status: "in_progress"
};

const metrics = calculateSLAMetrics(ticket);

console.log(`Estado: ${metrics.level}`);
console.log(`Quedan: ${metrics.timeRemaining.hours}h ${metrics.timeRemaining.minutes}m`);
console.log(`Color: ${metrics.displayColor}`);
```

### Obtener tickets críticos

```typescript
import { getCriticalTickets } from "@/lib/slaMetrics";

const critical = getCriticalTickets(allTickets);
console.log(`Tickets críticos: ${critical.length}`);
critical.forEach(t => console.log(`- ${t.title}`));
```

## 🔄 Actualización en Tiempo Real

Los cálculos de SLA se actualizan automáticamente cada vez que:
- Se abre la página
- Se actualiza un ticket
- Se ejecuta `refreshData()`
- Pasan 30 segundos (en dashboard)

## 📞 Soporte y Troubleshooting

### "¿Por qué un ticket dice que está vencido si acabo de crearlo?"
- Verifica la fecha de creación del ticket
- Confirma que la zona horaria sea correcta

### "¿Cómo cambio los tiempos de SLA?"
- Edita `SLA_CONFIG` en `src/lib/slaMetrics.ts`
- Los cambios afectan inmediatamente

### "¿Se sincroniza con Supabase?"
- Los cálculos son locales (no requieren BD)
- Se basan en `ticket.created_at` y estado actual
- Completamente offline-compatible

---

**Última actualización:** 2026-06-21
**Versión:** 1.0 Professional

# 🕐 Guía de Implementación - Sistema Avanzado de Tracking de Tiempos SLA

## 📋 Resumen

Se ha implementado un **sistema completo de tracking de tiempos detallados** que registra cada milisegundo, segundo y minuto desde que el técnico comienza el trabajo hasta que lo finaliza. Este sistema incluye:

✅ **Cronómetro en vivo** con precisión de milisegundos
✅ **Registro de pausas** con razón y duración exacta
✅ **Dashboard admin** con análisis de eficiencia por técnico
✅ **Timeline de eventos** con todos los cambios de estado
✅ **Métricas de SLA mejoradas** considerando tiempo real de trabajo

---

## 🔧 Instalación y Configuración

### Paso 1: Ejecutar Migración SQL

Copiar el contenido de `supabase/migration_time_tracking.sql` y ejecutar en el editor SQL de Supabase:

```bash
# O si tienes acceso directo a Supabase:
supabase db push
```

Esto crea las tablas necesarias:
- `work_time_logs` - Log de eventos (started, paused, resumed, completed)
- `work_breaks` - Registro de pausas con duración exacta
- Campos en `tickets`: `work_started_at`, `work_ended_at`, `work_duration_ms`, `active_duration_ms`, `paused_duration_ms`

### Paso 2: Importar Servicios en Componentes

El sistema tiene 3 capas:

**Capa 1: Servicio de Tracking** (`src/lib/timeTracking.ts`)
```typescript
import {
  startWorkTimer,
  pauseWorkTimer,
  resumeWorkTimer,
  completeWorkTimer,
  getWorkTimeSummary,
  getLiveWorkTimer,
  formatDuration,
} from '@/lib/timeTracking';
```

**Capa 2: Componentes UI** (`src/components/`)
- `WorkTimer` - Cronómetro (versión compacta o completa)
- `WorkTimeSummaryView` - Resumen de tiempos con detalles
- `AdminAnalyticsDashboard` - Dashboard admin con métricas

**Capa 3: Páginas** (`src/app/(protected)/`)
- `/tickets/[id]/enhanced-page.tsx` - Detalle de ticket mejorado
- `/admin/analytics/` - Panel de análisis de tiempos

---

## 📱 Componentes Disponibles

### 1. WorkTimer Component

**Propósito:** Cronómetro para técnicos, registra cada segundo de trabajo.

```typescript
import { WorkTimer } from '@/components/WorkTimer';

<WorkTimer
  ticketId="ticket-123"
  technicianId="tech-456"
  compact={false}  // true para versión mini, false para completa
  onWorkStarted={() => console.log('Trabajo iniciado')}
  onWorkPaused={() => console.log('Trabajo pausado')}
  onWorkCompleted={() => console.log('Trabajo completado')}
/>
```

**Características:**
- Display HH:MM:SS.MMM (horas:minutos:segundos.milisegundos)
- 3 estados: Idle → Running → Paused
- Modal para registrar razón de pausa
- Botones: Iniciar, Pausar, Reanudar, Finalizar

**Versión Compacta** (`compact={true}`):
- Display pequeño de cronómetro
- Botones más pequeños
- Ideal para widgets o sidebars

### 2. WorkTimeSummaryView Component

**Propósito:** Mostrar resumen completo de tiempos con análisis.

```typescript
import { WorkTimeSummaryView } from '@/components/WorkTimeSummaryView';

<WorkTimeSummaryView
  ticketId="ticket-123"
  showDetails={true}  // Mostrar timeline y pausas
/>
```

**Muestra:**
- 3 tarjetas: Tiempo Total, Tiempo Activo, Tiempo en Pausas
- Timeline completo de eventos
- Detalles de cada pausa
- Estadísticas de eficiencia

### 3. AdminAnalyticsDashboard Component

**Propósito:** Dashboard para admins con análisis de productividad.

```typescript
import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';

<AdminAnalyticsDashboard days={30} />
```

**Muestra:**
- KPIs de resumen (total tickets, eficiencia, pausas)
- Tabla de técnicos con métricas comparativas
- Panel expandible por técnico seleccionado
- Ranking de eficiencia

---

## 🔌 Funciones del Servicio `timeTracking.ts`

### `startWorkTimer(ticketId, technicianId)`
```typescript
await startWorkTimer('ticket-123', 'tech-456');
// Inicia cronómetro, registra evento 'started'
```

### `pauseWorkTimer(ticketId, technicianId, reason?)`
```typescript
await pauseWorkTimer('ticket-123', 'tech-456', 'Almuerzo');
// Pausa y registra razón en tabla work_breaks
```

### `resumeWorkTimer(ticketId, technicianId)`
```typescript
await resumeWorkTimer('ticket-123', 'tech-456');
// Reanuda, calcula duración de la pausa anterior
```

### `completeWorkTimer(ticketId, technicianId, notes?)`
```typescript
await completeWorkTimer('ticket-123', 'tech-456', 'Trabajo completado');
// Finaliza, cierra cualquier pausa abierta, calcula totales
```

### `getWorkTimeSummary(ticketId)`
```typescript
const summary = await getWorkTimeSummary('ticket-123');
// {
//   total_duration_ms: 7200000,      // 2 horas
//   active_duration_ms: 6900000,     // 1:55 horas
//   paused_duration_ms: 300000,      // 5 minutos
//   break_count: 2,
//   events: [...],
//   breaks: [...]
// }
```

### `getLiveWorkTimer(ticketId)`
```typescript
const timer = await getLiveWorkTimer('ticket-123');
// {
//   isRunning: true,
//   elapsedMs: 3600000,              // Tiempo transcurrido en milisegundos
//   startTime: Date,
//   lastEvent: 'started' | 'paused'
// }
```

### `formatDuration(ms)`
```typescript
const dur = formatDuration(7200000);
// {
//   hours: 2,
//   minutes: 0,
//   seconds: 0,
//   milliseconds: 0,
//   formatted: "02:00:00.000"
// }
```

### `getTechnicianAverageWorkTime(techId, days?)`
```typescript
const stats = await getTechnicianAverageWorkTime('tech-456', 30);
// {
//   average_total_ms: 14400000,      // Promedio 4 horas por ticket
//   average_active_ms: 13800000,     // Promedio activo 3:50 horas
//   total_tickets: 45
// }
```

### `getTechnicianBreakStats(techId, days?)`
```typescript
const breaks = await getTechnicianBreakStats('tech-456', 30);
// {
//   total_breaks: 120,
//   total_break_time_ms: 3600000,
//   average_break_duration_ms: 30000,
//   break_reasons: { "Almuerzo": 45, "Desplazamiento": 75 }
// }
```

---

## 📊 Estructura de Datos

### Tabla: `work_time_logs`
```sql
id (UUID)                    -- Identificador único
ticket_id (UUID)             -- Referencia a ticket
technician_id (UUID)         -- Técnico que hizo la acción
event_type (VARCHAR)         -- 'started' | 'paused' | 'resumed' | 'completed'
timestamp (TIMESTAMP)        -- Cuándo ocurrió exactamente
duration_ms (BIGINT)         -- Duración desde evento anterior
notes (TEXT)                 -- Notas adicionales
created_at (TIMESTAMP)       -- Cuándo se registró
```

### Tabla: `work_breaks`
```sql
id (UUID)                    -- Identificador único
ticket_id (UUID)             -- Referencia a ticket
technician_id (UUID)         -- Técnico que se tomó el break
break_start (TIMESTAMP)      -- Inicio exacto del break
break_end (TIMESTAMP)        -- Fin exacto del break (NULL si aún abierto)
break_duration_ms (BIGINT)   -- Duración total del break
break_reason (VARCHAR)       -- Razón de la pausa
created_at (TIMESTAMP)       -- Cuándo se registró
```

### Campos Agregados en `tickets`
```sql
work_started_at (TIMESTAMP)  -- Primer 'started' event
work_ended_at (TIMESTAMP)    -- Evento 'completed'
work_duration_ms (BIGINT)    -- Tiempo total: end - start
paused_duration_ms (BIGINT)  -- Suma de todos los breaks
active_duration_ms (BIGINT)  -- work_duration_ms - paused_duration_ms
```

---

## 🎯 Casos de Uso

### Caso 1: Técnico inicia trabajo
```typescript
// En componente de ticket detail
await startWorkTimer(ticketId, technicianId);
// Registra: event_type='started', timestamp=NOW()
```

### Caso 2: Técnico se toma almuerzo
```typescript
await pauseWorkTimer(ticketId, technicianId, 'Almuerzo');
// Crea registro en work_breaks con break_start=NOW()
```

### Caso 3: Técnico regresa del almuerzo
```typescript
await resumeWorkTimer(ticketId, technicianId);
// Actualiza work_breaks: break_end=NOW(), break_duration_ms=calculado
// Registra: event_type='resumed'
```

### Caso 4: Técnico finaliza el trabajo
```typescript
await completeWorkTimer(ticketId, technicianId);
// Cierra cualquier break abierto
// Registra: event_type='completed'
// Actualiza ticket: work_ended_at=NOW(), status='completed'
// Calcula totales de duración
```

### Caso 5: Admin revisa eficiencia de técnicos
```typescript
const dashboard = <AdminAnalyticsDashboard days={30} />;
// Carga métricas de los últimos 30 días
// Muestra tabla con: técnico, tickets, tiempo promedio, eficiencia
// Permite hacer clic para ver detalles
```

---

## 📈 KPIs Disponibles

**Para cada técnico:**
- Total de tickets completados
- Tiempo promedio por ticket (total, activo, en pausas)
- Eficiencia (% tiempo activo vs tiempo total)
- Total de pausas
- Duración promedio de pausas
- Razones de pausas más frecuentes

**Agregados (todo el sistema):**
- Total de tickets
- Eficiencia promedio de técnicos
- Total de pausas en período
- Tiempo total en pausas
- Ranking de eficiencia

---

## ⚡ Integración Rápida

### En Ticket Detail Page

```typescript
// src/app/(protected)/tickets/[id]/page.tsx

import { WorkTimer } from '@/components/WorkTimer';
import { WorkTimeSummaryView } from '@/components/WorkTimeSummaryView';

export default function TicketPage() {
  const [tab, setTab] = useState('timer');

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('timer')}>Cronómetro</button>
        <button onClick={() => setTab('summary')}>Resumen</button>
      </div>

      {tab === 'timer' && (
        <WorkTimer
          ticketId={ticketId}
          technicianId={technicianId}
          compact={false}
        />
      )}

      {tab === 'summary' && (
        <WorkTimeSummaryView ticketId={ticketId} />
      )}
    </div>
  );
}
```

### En Admin Dashboard

```typescript
// src/app/(protected)/admin/analytics/page.tsx

import { AdminAnalyticsDashboard } from '@/components/AdminAnalyticsDashboard';
import { useState } from 'react';

export default function AdminPage() {
  const [days, setDays] = useState(30);

  return (
    <div>
      <select value={days} onChange={e => setDays(parseInt(e.target.value))}>
        <option value={7}>7 días</option>
        <option value={30}>30 días</option>
        <option value={90}>90 días</option>
      </select>

      <AdminAnalyticsDashboard days={days} />
    </div>
  );
}
```

---

## 🔐 Seguridad RLS

Todas las operaciones respetan las políticas RLS existentes:
- Los técnicos solo ven sus propios logs
- Los admins ven todos los logs de su tenant
- Los datos están aislados por tenant_id

---

## 🐛 Troubleshooting

**P: El cronómetro no se reinicia después de completar**
R: Asegúrate que `completeWorkTimer` se ejecutó correctamente y que la UI se recarga después.

**P: Las pausas no se restan del tiempo activo**
R: Verifica que el trigger `trigger_calculate_work_duration` está activo en Supabase.

**P: No veo tiempo activo diferente del total**
R: Asegúrate que se registraron pausas con `pauseWorkTimer` antes de completar.

**P: Las estadísticas de admin están vacías**
R: Espera a que haya tickets completados con `work_ended_at` no nulo.

---

## 📋 Checklist de Implementación

- [ ] Migración SQL ejecutada en Supabase
- [ ] Importar `timeTracking.ts` en componentes necesarios
- [ ] Agregar `WorkTimer` a ticket detail page
- [ ] Agregar `WorkTimeSummaryView` a ticket detail o dashboard
- [ ] Crear página `/admin/analytics/` con `AdminAnalyticsDashboard`
- [ ] Probar: Iniciar cronómetro
- [ ] Probar: Pausar y reanudar
- [ ] Probar: Ver resumen de tiempos
- [ ] Probar: Dashboard admin con datos reales
- [ ] Verificar RLS policies en Supabase

---

## 📞 Soporte

Para preguntas o problemas:
1. Revisar logs en `work_time_logs` y `work_breaks`
2. Verificar que los tiempos están en milisegundos
3. Confirmar que ticket.work_duration_ms se actualiza automáticamente
4. Revisar políticas RLS en Supabase si hay acceso denegado

---

**Estado:** ✅ Sistema completo y listo para usar
**Precisión:** Milisegundos (1000 = 1 segundo)
**Formato:** HH:MM:SS.MMM

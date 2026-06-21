# 📋 Instrucciones para Ejecutar Migración de Time Tracking en Supabase

## ⚡ Paso 1: Copiar SQL Completo

Abre el archivo `supabase/migration_time_tracking.sql` del proyecto y copia TODO el contenido SQL.

## 🔌 Paso 2: Ejecutar en Supabase

1. Ve a tu proyecto en: https://supabase.com/dashboard
2. Haz clic en **SQL Editor** en el menú izquierdo
3. Haz clic en **+ New Query**
4. Pega el SQL completo en el editor
5. Haz clic en el botón ▶️ **Execute** (o presiona Ctrl+Enter)

**Espera a que aparezca: ✅ Success** (puede tardar 5-10 segundos)

---

## 📊 Paso 3: Verificar que Funcionó

Para verificar que la migración fue exitosa, copia y ejecuta este SQL:

```sql
-- Verificar que existen las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('work_time_logs', 'work_breaks', 'tickets');
```

**Resultado esperado:** Debe mostrar 3 filas (work_time_logs, work_breaks, tickets)

---

## 🚀 Paso 4: Integrar en la Aplicación

### En Módulo de Tickets - Mostrar SLA

Usa el componente `SLAIndicator` en la lista de tickets:

```typescript
// src/app/(protected)/tickets/page.tsx

import { SLAIndicator } from '@/components/SLAIndicator';

// En el loop de tickets:
{tickets.map(ticket => (
  <div key={ticket.id} className="border p-4 rounded-lg">
    <h3>{ticket.description}</h3>
    
    {/* Mostrar SLA compacto */}
    <SLAIndicator
      ticketId={ticket.id}
      createdAt={ticket.created_at}
      priority={ticket.priority}
      status={ticket.status}
      compact={true}  // true para versión mini, false para versión completa
    />
  </div>
))}
```

### En Módulo de Administración - Panel Completo

El módulo de **Métricas y SLA** está disponible en:
- Ruta: `/admin/metricas-sla`
- Componente: `SLAMetricsPanel`

---

## 🎨 Esquema de Colores

El sistema utiliza color-coding automático basado en porcentaje SLA:

| Color  | Porcentaje | Estado | Acción |
|--------|-----------|--------|--------|
| 🟢 Verde | ≥70% | Óptimo | Sin acción |
| 🟡 Amarillo | 50-70% | Alerta | Revisar |
| 🔴 Rojo | <50% | Crítico | Acción Inmediata |

**Ejemplo:**
- ✅ Ticket con 85% SLA → Verde
- ⚠️ Ticket con 60% SLA → Amarillo
- 🚨 Ticket con 40% SLA → Rojo

---

## 📱 Componentes Disponibles

### 1. SLAIndicator (Para Listas)
```typescript
<SLAIndicator
  ticketId="123"
  createdAt="2026-06-07T10:00:00Z"
  priority="high"
  status="pending"
  compact={true}  // true = mini, false = grande
/>
```

**Uso:** En listados de tickets para mostrar estado rápido

### 2. SLAMetricsPanel (Para Dashboard)
```typescript
<SLAMetricsPanel />
```

**Uso:** En dashboard de administración para análisis completo

### 3. WorkTimer (Para Tracking)
```typescript
<WorkTimer
  ticketId="123"
  technicianId="456"
  compact={false}
/>
```

**Uso:** En detalle de ticket para registrar tiempo real

### 4. WorkTimeSummaryView (Para Resumen)
```typescript
<WorkTimeSummaryView
  ticketId="123"
  showDetails={true}
/>
```

**Uso:** Para ver desglose completo de tiempos

---

## 📂 Estructura de Carpetas Nuevas

```
src/
├── components/
│   ├── SLAMetricsPanel.tsx          ← Dashboard profesional
│   ├── SLAIndicator.tsx              ← Indicador para listas
│   ├── WorkTimer.tsx                 ← Cronómetro
│   └── WorkTimeSummaryView.tsx        ← Resumen de tiempos
├── lib/
│   ├── timeTracking.ts               ← Lógica de tracking
│   └── slaCalculations.ts            ← Cálculos de SLA
└── app/(protected)/
    └── admin/
        └── metricas-sla/
            └── page.tsx              ← Nueva página admin
```

---

## 🔧 Datos Registrados

Después de ejecutar la migración, se crean automáticamente:

### Tabla: `work_time_logs`
- Registra cada evento de trabajo
- Tipos: `started`, `paused`, `resumed`, `completed`
- Timestamps exactos en milisegundos
- Permite auditoría completa

### Tabla: `work_breaks`
- Registra cada pausa
- Incluye razón (almuerzo, desplazamiento, etc)
- Duración exacta en milisegundos
- Permite análisis de productividad

### Campos en `tickets`
```
work_started_at     → Cuando comenzó el trabajo
work_ended_at       → Cuando finalizó
work_duration_ms    → Duración total en ms
active_duration_ms  → Tiempo activo (sin pausas)
paused_duration_ms  → Tiempo en pausas
```

---

## ⚠️ Troubleshooting

### "Error: Permission denied"
- Verifica estar logueado en Supabase
- Asegúrate de ser admin del proyecto

### "Error: Table already exists"
- Las migraciones son idempotentes (IF NOT EXISTS)
- Puedes ejecutarla múltiples veces sin problema

### "No veo datos en el dashboard"
- Espera a que haya tickets creados
- Los tickets necesitan tener `created_at` registrado

### "El cronómetro no funciona"
- Verifica que ejecutaste la migración SQL
- Revisa que tengas permisos RLS correctos

---

## 🎯 Resumen de Implementación

1. ✅ Ejecutar SQL de migración
2. ✅ Usar `SLAIndicator` en listas de tickets
3. ✅ Usar `WorkTimer` en detalle de ticket
4. ✅ Acceder a `/admin/metricas-sla` para panel completo
5. ✅ Sistema automáticamente calcula y colorea por SLA

**Resultado:** Sistema profesional de medición y monitoreo de SLA con reportes en tiempo real.

---

## 📞 Próximas Mejoras

- [ ] Gráficos históricos de SLA
- [ ] Exportar reportes a PDF
- [ ] Alertas automáticas por email
- [ ] Integración con Slack
- [ ] Predicción de SLA con ML

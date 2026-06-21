# 🚀 GUÍA RÁPIDA DE INTEGRACIÓN - CoordinaTech Nuevas Features

## ✅ Completado en Esta Sesión

Se han creado **7 nuevos componentes/servicios** listos para integrar:

| Archivo | Función | Dónde Integrar |
|---------|---------|----------------|
| `src/components/DashboardKPIs.tsx` | Display de KPIs (4 tarjetas) | Home dashboard |
| `src/components/CreateTicketForm.tsx` | Formulario con validación Zod | `/tickets/new` |
| `src/components/EvidenceCapture.tsx` | Captura foto/GPS/firma | Ticket detail page |
| `src/components/SLAAlertBadge.tsx` | Badge semafórico (rojo/amarillo/azul/verde) | Listados de tickets |
| `src/hooks/useNotifications.ts` | Real-time notifications vía Supabase | AppShell/layout |
| `src/lib/slaCalculations.ts` | Lógica SLA (alertas < 15%) | Importar en dashboard |
| `src/lib/reportGenerator.ts` | Generar PDFs de reportes | Botones export |
| `src/app/(protected)/dashboard/page.tsx` | Nueva página dashboard | Acceso `/dashboard` |

---

## 🔧 Pasos de Integración Inmediatos

### 1️⃣ Integrar DashboardKPIs en Home

**Archivo:** `src/app/(protected)/page.tsx`

```typescript
'use client';

import { DashboardKPIs } from '@/components/DashboardKPIs';
import { calculateAggregatedMetrics } from '@/lib/slaCalculations';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const loadMetrics = async () => {
      const { data } = await supabase.from('tickets').select('*');
      if (data) {
        const agg = calculateAggregatedMetrics(data);
        setMetrics(agg);
      }
    };
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bienvenido</h1>
      {metrics && <DashboardKPIs metrics={metrics} />}
      {/* Resto del contenido */}
    </div>
  );
}
```

### 2️⃣ Reemplazar Formulario de Tickets

**Archivo:** `src/app/(protected)/tickets/new/page.tsx`

```typescript
'use client';

import { CreateTicketForm } from '@/components/CreateTicketForm';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function NewTicketPage() {
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    const loadTechs = async () => {
      const { data } = await supabase.from('technicians').select('id, name');
      setTechnicians(data || []);
    };
    loadTechs();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Crear Nuevo Ticket</h1>
      <CreateTicketForm technicians={technicians} />
    </div>
  );
}
```

### 3️⃣ Agregar Captura de Evidencias

**Archivo:** `src/app/(protected)/tickets/[id]/page.tsx` (agregar)

```typescript
'use client';

import { EvidenceCapture } from '@/components/EvidenceCapture';
import { supabase } from '@/lib/supabase';

// Dentro del componente:
const handleEvidenceSave = async (evidence) => {
  const { error } = await supabase
    .from('tickets')
    .update({ evidence }) // O guardar en tabla separada
    .eq('id', ticketId);

  if (error) throw error;
};

// En el JSX:
<EvidenceCapture 
  ticketId={ticketId} 
  onSave={handleEvidenceSave}
/>
```

### 4️⃣ Agregar Real-Time Notifications

**Archivo:** `src/components/AppShell.tsx` (agregar al top)

```typescript
'use client';

import { useRealtimeNotifications, useNotificationToast } from '@/hooks/useNotifications';
import { Bell } from 'lucide-react';
import { useState } from 'react';

export function AppShell({ children }) {
  const [notifications, setNotifications] = useState([]);
  const showToast = useNotificationToast();

  useRealtimeNotifications((notification) => {
    setNotifications(prev => [notification, ...prev]);
    showToast(notification);
  });

  return (
    <div>
      {/* Aquí va el header con el contador de notificaciones */}
      <button className="relative">
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
      {children}
    </div>
  );
}
```

### 5️⃣ Agregar Botón de Exportar PDF

**Agregar en ticket detail o dashboard:**

```typescript
import { generateTicketReportPDF, downloadPDF } from '@/lib/reportGenerator';

async function handleExportPDF() {
  const pdf = await generateTicketReportPDF({
    ticketId: ticket.id,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    clientName: ticket.client_name,
    createdAt: new Date(ticket.created_at),
    slaCompliancePercent: 95,
  });

  downloadPDF(pdf, `ticket-${ticket.id}.pdf`);
}

// En JSX:
<button onClick={handleExportPDF} className="...">
  📥 Exportar PDF
</button>
```

---

## 🎯 Checklist de Integración

- [ ] Importar `DashboardKPIs` en home page
- [ ] Reemplazar formulario ticket con `CreateTicketForm`
- [ ] Agregar `EvidenceCapture` en ticket detail
- [ ] Integrar `useRealtimeNotifications` en AppShell
- [ ] Añadir botones de exportar PDF
- [ ] Probar alertas SLA en tiempo real
- [ ] Verificar RLS policies en Supabase
- [ ] Crear endpoint de recuperación de password

---

## 📚 Componentes Listos para Usar

### SLAAlertBadge
```typescript
import { SLAAlertBadge } from '@/components/SLAAlertBadge';

<SLAAlertBadge 
  status="critical"
  timeRemainingPercent={10}
  hoursRemaining={2.5}
/>
```

**Estados:** `critical` | `warning` | `ok` | `completed`

### Notificaciones
```typescript
import { useRealtimeNotifications, useSLACriticalAlerts } from '@/hooks/useNotifications';

// Escuchar cambios de tickets en tiempo real
useRealtimeNotifications(handleNotification);

// Monitorear alertas SLA
useSLACriticalAlerts(tickets, handleAlert);
```

### Cálculos SLA
```typescript
import { calculateSLA, getCriticalAlerts } from '@/lib/slaCalculations';

const sla = calculateSLA(createdAt, 'high', 'pending');
// Retorna: { hoursRemaining, percentRemaining, status, timeWindow }

const criticals = getCriticalAlerts(tickets);
// Retorna array de tickets en estado crítico
```

---

## ⚠️ Notas Importantes

1. **Los datos son de demo** - `DashboardKPIs` y `slaCalculations` esperan datos reales de Supabase
2. **Validación en cliente** - `CreateTicketForm` valida primero localmente, luego en servidor
3. **Canvas para firma** - Requiere soporte de HTML5 Canvas (navegadores modernos)
4. **GPS requiere HTTPS** - O localhost para desarrollo
5. **Realtime necesita suscripción** - En Supabase habilitar "Realtime" en tabla de tickets

---

## 🐛 Troubleshooting

**Error: "Canvas not supported"**
→ Verificar que es navegador moderno (IE no funciona)

**GPS no funciona**
→ Usar HTTPS o localhost, permisos del navegador

**Notificaciones no aparecen**
→ Verificar que Realtime está habilitado en Supabase
→ Revisar console.log de errores

**PDFs no se generan**
→ Verificar jsPDF instalado: `npm list jspdf`
→ Revisar objeto de datos tenga todos los campos

---

## 📞 Próximos Pasos

1. **Integración**: Incorporar componentes en rutas existentes
2. **Testing**: Validar flujos con datos reales
3. **RLS**: Verificar políticas multi-tenant en Supabase
4. **Password Recovery**: Crear endpoint de reset password
5. **Mobile**: Preparar React Native (Fase 2 del documento)

---

**Estado:** ✅ Todos los archivos creados y listos para usar
**Dependencias:** ✅ Instaladas (jspdf, zod, jspdf-autotable)
**Próximo:** Integración en rutas existentes

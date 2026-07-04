# REFACTOR_PLAN.md — Plan de mejora de código existente (CoordinaTech)

**Fecha:** 2026-07-03
**Alcance:** Solo calidad interna del código ya existente. **Cero funcionalidades nuevas.** Solo lectura — ningún archivo fue modificado.
**Metodología:** 3 agentes en paralelo, cada uno leyendo el 100% del código fuente (no resúmenes) de una capa: (1) `src/lib/*` + `src/context/AppContext.tsx` + `src/hooks/*` + `src/types/domain.ts`, (2) `src/components/*` (26 archivos), (3) `src/app/**/*` (todas las páginas, layouts y rutas API). Cada hallazgo de "archivo muerto" fue verificado con búsqueda real en todo `src/`, no supuesto por el nombre.

Este documento **no repite** hallazgos de negocio, seguridad o UX ya cubiertos en `PROJECT_AUDIT.md` y `UX_REVIEW.md` — aquí cada punto se enmarca puramente como mantenibilidad/estructura del código.

---

## Resumen ejecutivo

El problema de refactor más grande de todo el proyecto es uno solo, repetido en tres capas: **el cálculo de SLA existe en tres módulos de negocio (`src/lib/sla.ts`, `slaCalculations.ts`, `slaMetrics.ts`) más re-implementaciones sueltas dentro de componentes y páginas**, cada uno con su propio umbral, su propia forma de retorno y su propio nombre de función (`calculateSLACompliance` existe tres veces con tres firmas distintas). Resolver esto de raíz automáticamente resuelve gran parte de los demás hallazgos de duplicación.

El segundo problema es **volumen de código muerto**: se confirmaron **~15 archivos completos sin ningún importador real** (ni una sola vez, verificado por búsqueda) que suman más de 2.500 líneas, más una ruta huérfana (`enhanced-page.tsx`) que Next.js nunca sirve y que mantiene "vivos" artificialmente a otros dos componentes.

El tercer problema es la ausencia de una capa de presentación compartida: colores, umbrales, formateo de fecha y mapas de estado se redefinen archivo por archivo en vez de importarse de un solo lugar.

**Números:**
| Categoría | Hallazgos consolidados |
|---|---|
| Código / funciones duplicadas | 13 |
| Componentes / archivos enormes | 7 |
| Hooks repetidos | 4 |
| Estados innecesarios | 4 |
| Imports innecesarios | 3 |
| Archivos muertos | ~15 archivos + 5 exports sueltos |
| Malos nombres | 8 |
| Problemas SOLID | 6 |
| Problemas DRY | 3 (agregados, ya que se solapan con duplicación) |
| Problemas KISS | 4 |

---

## Plan de fases (orden recomendado de ejecución)

No se ejecuta nada de esto ahora — es la hoja de ruta sugerida para cuando se decida refactorizar.

### Fase 0 — Eliminar código muerto confirmado (riesgo casi nulo, impacto inmediato)
Borrar o resolver deliberadamente (decisión de producto, no de código) los ~15 archivos sin ningún uso real. Reduce el árbol de búsqueda en miles de líneas sin tocar ningún comportamiento vivo. Ver sección "Archivos muertos" para el detalle y las dos excepciones que requieren una decisión antes de borrar (`enhanced-page.tsx`, `CreateTicketForm.tsx`).

### Fase 1 — Consolidar el motor de SLA en un solo módulo
El cambio de mayor apalancamiento de todo el plan. Unifica `sla.ts` + `slaCalculations.ts` + `slaMetrics.ts` en un único módulo con una sola tabla de umbrales (la de `slaMetrics.ts`, que es la que coincide con la política de negocio documentada), un solo `calculateSLACompliance`, un solo buscador de "tickets críticos" y un solo agrupador por estado. Repuntar los ~10 componentes/páginas consumidoras a la nueva fuente única.

### Fase 2 — Unificar componentes duplicados de presentación
Con el motor de SLA ya unificado, consolidar los componentes visuales que dependían de él por separado: los 5-6 badges/indicadores SLA en un solo componente parametrizable, y los pares `DocumentsViewer`/`DocumentViewer`/`DocumentUploader` y `EvidenceCapture`/`WorkPhotoCapture` en implementaciones únicas.

### Fase 3 — Dividir los archivos/componentes enormes
Con duplicados ya fuera del camino, dividir los archivos que mezclan demasiadas responsabilidades: `repository.ts`, `security.ts`, `tickets/[id]/page.tsx`, `SLAMetricsPanel.tsx`, `AdminAnalyticsDashboard.tsx`, `WorkTimer.tsx`, `calendar/page.tsx`.

### Fase 4 — Extraer hooks compartidos y limpiar estado
Introducir `usePolling`/`useAsyncData`, `useTicker`, `useRoleGuard`, y colapsar los estados que siempre cambian juntos (los 4 arrays de `AppContext`, los 6 `useState` del modal "no completado").

### Fase 5 — Limpieza de nombres, imports y constantes DRY menores
Renombrados (`config_visual`→`visualConfig`, `timeWindow`→`timeWindowMinutes`, convención de idioma en `WorkOrder`), eliminación de imports/props no usados, centralización de locale de fecha y paletas de color de umbral.

---

## 1. Código duplicado

### 1.1 — Tres motores de cálculo de SLA con formas distintas de la misma lógica
- Archivos: `src/lib/sla.ts:6-115`, `src/lib/slaCalculations.ts:9-101`, `src/lib/slaMetrics.ts:7-231`
- Qué se ve: los tres recorren la misma forma "tiempo transcurrido vs. ventana → porcentaje restante → balde ok/warning/critical", con tablas de umbrales distintas (una por prioridad en horas, otra por prioridad con horas distintas, otra por tipo de ticket en minutos).
- Dirección de refactor: un solo `src/lib/sla/engine.ts` con una tabla de configuración y una función `evaluateSLA(ticket)`; los otros dos archivos se eliminan o quedan como re-exports temporales.

### 1.2 — `getSLA()` reimplementado de forma local en páginas y componentes
- Archivos: `src/app/(protected)/tickets/[id]/page.tsx:68-87`, `src/app/(protected)/ordenes-trabajo/page.tsx:26-42`, más el estado-color inline de `src/app/(protected)/calendar/page.tsx:23-29`
- Qué se ve: cada página define su propia función `getSLA(scheduledDate, status)` casi idéntica, con diferencias sutiles de redacción del label ("Vencido hace Xd Yh" vs "Xd vencido") y de colores.
- Dirección de refactor: eliminar las copias locales y consumir la función única resultante de la Fase 1.

### 1.3 — `AbortController` creado pero nunca conectado (4 copias idénticas)
- Archivo: `src/lib/repository.ts:36-37, 136-137, 259-260, 297-298`
- Qué se ve: en `getTechnicians`, `getTickets`, `getWorkOrders`, `getIncompleteReports` se repite `const controller = new AbortController(); setTimeout(() => controller.abort(), 5000);` pero `controller.signal` nunca se pasa a la consulta — el timeout no hace nada real.
- Dirección de refactor: extraer un único `fetchWithTimeout(builder, ms)` reutilizado por las cuatro funciones (o eliminar el controller si no se va a conectar).

### 1.4 — Re-importación dinámica repetida de un valor ya importado estáticamente
- Archivo: `src/lib/timeTracking.ts:1,39,84,132,202,281`
- Qué se ve: 5 funciones hacen `await import('./supabase')` para obtener `hasSupabaseEnv`, pese a que `supabase` ya se importa estáticamente arriba del archivo.
- Dirección de refactor: importar `hasSupabaseEnv` una sola vez de forma estática y aplicar el mismo guard de "modo offline" consistentemente en todas las funciones del archivo (hoy algunas lo aplican y otras no).

### 1.5 — Tres implementaciones divergentes de "vista de documentos adjuntos"
- Archivos: `src/components/DocumentsViewer.tsx:17-38`, `src/components/DocumentUploader.tsx:72-76`, `src/components/DocumentViewer.tsx` (completo)
- Qué se ve: `formatSize(bytes)` copiada byte-por-byte en dos archivos; el preview de imagen se resuelve de dos formas incompatibles (`window.open()+document.write` vs. modal React propio).
- Dirección de refactor: un `formatFileSize()` compartido en `src/lib` y un único componente `<FileRow>`/modal de preview reutilizado por los tres.

### 1.6 — Captura de cámara + GPS reimplementada dos veces
- Archivos: `src/components/EvidenceCapture.tsx:28-59`, `src/components/WorkPhotoCapture.tsx:35-114`
- Qué se ve: cada uno define su propio `startCamera`/`stopCamera`/captura por canvas con variaciones menores (uno pide `facingMode: 'environment'`, el otro no).
- Dirección de refactor: extraer `useCameraCapture()` compartido (ver también sección "Archivos muertos" — uno de los dos puede no necesitar sobrevivir).

### 1.7 — Modal de "razón de pausa" duplicado dentro del mismo archivo
- Archivo: `src/components/WorkTimer.tsx:238-298` (versión compacta) y `:383-443` (versión completa)
- Qué se ve: el mismo modal (lista de razones predefinidas, textarea condicional, botones) escrito dos veces en el mismo archivo, solo cambiando clases de tamaño.
- Dirección de refactor: extraer `<BreakReasonModal density="compact"|"full" />` como subcomponente único.

### 1.8 — Bloques de navegación repetidos en `AppShell`
- Archivo: `src/components/AppShell.tsx:70-95`
- Qué se ve: el mismo `.map()` sobre links se repite 3 veces (Principal/Administración/Cuenta) con solo el título cambiando.
- Dirección de refactor: modelar como `sections: {label, links}[]` y un único `.map()` anidado.

### 1.9 — Guards de rol duplicados en vez de reutilizar `RoleOnly`
- Archivos: `src/app/(protected)/ordenes-trabajo/page.tsx:185-187`, `src/app/(protected)/tickets/new/page.tsx:12-15`, `src/app/(protected)/tickets/[id]/edit/page.tsx:13-16`
- Qué se ve: cada uno reimplementa a mano un chequeo de rol con su propia redacción, mientras `src/components/RoleGuard.tsx` ya expone un `<RoleOnly allow={[...]}>` usado en otras dos páginas.
- Dirección de refactor: estandarizar las tres páginas para usar `RoleOnly` (o una variante con redirect) y borrar los chequeos manuales.

### 1.10 — El mismo patrón de guard "early-return antes de los hooks" copiado en dos páginas
- Archivos: `src/app/(protected)/tickets/new/page.tsx:12-26`, `src/app/(protected)/tickets/[id]/edit/page.tsx:13-22`
- Qué se ve: ambas colocan `if (user?.role === "tech") { router.replace(...); return null; }` antes de sus propios `useState`/`useMemo` — el mismo error estructural copiado dos veces.
- Dirección de refactor: mover el guard a un hook compartido `useRoleGuard(['admin'])` que se ejecute antes de cualquier hook propio de la página.

### 1.11 — Tres a cuatro mapas de color por "3 niveles de estado" redefinidos localmente
- Archivos: `src/components/AdminAnalyticsDashboard.tsx:47-72`, `src/components/SLAMetricsPanel.tsx:61-89`, `src/components/AdminSLADashboard.tsx:24-25`, `src/components/SLAAlertBadge.tsx:63-67`
- Qué se ve: cada uno calcula una etiqueta + terna de colores desde un porcentaje, con umbrales distintos entre sí (85/70, 70/50, 95/80, 15/30) para conceptos comparables (eficiencia, cumplimiento SLA).
- Dirección de refactor: una utilidad `getStatusTone(value, thresholds)` parametrizable en `src/lib`, con paleta compartida.

### 1.12 — Formateo de fecha con locale inconsistente entre archivos
- Archivos: `AdminAnalyticsDashboard.tsx:193` (`es-ES`), `AppShell.tsx:149` (`es-CL`), `MapViewer.tsx:55` (`es-CL`), `WorkTimeSummaryView.tsx:128` (`es-CL`), `SLAMetricsPanel.tsx:334` (`es-ES`)
- Dirección de refactor: centralizar en `src/lib/formatters.ts` una función `formatDate()`/`formatDateTime()` con el locale fijado una sola vez.

### 1.13 — Cálculo de "eficiencia" (activo/total) repetido como función y como inline
- Archivos: `AdminAnalyticsDashboard.tsx:42-45`, `WorkTimeSummaryView.tsx:197-199`
- Dirección de refactor: mover `getEfficiencyValue` a `src/lib/timeTracking.ts` y reutilizar desde ambos.

---

## 2. Componentes / archivos enormes

| Archivo | Líneas | Responsabilidades mezcladas |
|---|---|---|
| `src/lib/repository.ts` | 346 | Persistencia local (Dexie) + fetch remoto con timeout + normalización + algoritmo de dedup/merge + CRUD de 4 entidades distintas |
| `src/lib/security.ts` | 335 | Rate limiting + timeout de sesión + validación de password + headers CSRF + "encriptación" — 3 de 5 exports sin uso real |
| `src/components/SLAMetricsPanel.tsx` | 596 | Fetch directo a Supabase + polling 30s + 4 `useMemo` de agregación + 6 KPI cards + 3 gráficos + 1 tabla |
| `src/components/WorkTimer.tsx` | 449 | Dos árboles JSX casi completos bifurcados por la prop `compact`, cada uno con su propio modal, más polling a Supabase y un segundo timer de 100ms |
| `src/components/AdminAnalyticsDashboard.tsx` | 443 | Fetch con `Promise.allSettled` + cálculo agregado + IIFE inline para drilldown por técnico |
| `src/app/(protected)/tickets/[id]/page.tsx` | 606 | Helper SLA local + stepper + panel de acciones reutilizable + 5 paneles de acción condicionados por rol/estado + modal completo de "no completado" con 6 estados propios |
| `src/app/(protected)/calendar/page.tsx` | 567 | Grid de calendario + 3 paneles laterales, con cientos de declaraciones `style={{...}}` en línea en vez de las clases utilitarias usadas en el resto de la app |

**Dirección de refactor común:** en todos los casos, separar la capa de datos/cálculo (hook o función de `src/lib`) de la capa de presentación (componentes que solo reciben props y renderizan). Ver Fase 3.

---

## 3. Hooks repetidos

### 3.1 — Patrón "fetch + loading + error + `setInterval` de refresco" reimplementado 3 veces
- Archivos: `SLAMetricsPanel.tsx:107-114` (30s), `AdminAnalyticsDashboard.tsx:81-83`, `WorkTimer.tsx:56-108` (5s)
- Dirección de refactor: hook genérico `usePolling(fetcher, intervalMs)` o `useAsyncData(fetcher, deps)`.

### 3.2 — "Tick de reloj" duplicado para SLA y para cronómetro
- Archivos: `SLAIndicator.tsx:24-33` (`setInterval` de 1s, **una instancia por fila de ticket** en las listas), `WorkTimer.tsx:111-120` (`setInterval` de 100ms)
- Dirección de refactor: hook `useTicker(intervalMs)` que devuelva un timestamp reactivo, consumido por ambos para derivar sus valores con `useMemo`.

### 3.3 — Polling ad hoc en `AppContext` en vez de un primitivo reutilizable
- Archivo: `src/context/AppContext.tsx:130-138`
- Qué se ve: `useEffect` con `setInterval(refreshData, 10000)` hecho a mano junto a otro `useEffect` de carga inicial.
- Dirección de refactor: mismo `usePolling` de 3.1, usado también aquí.

### 3.4 — Selectores derivados recalculados por página en vez de vivir en el contexto
- Archivos: `src/app/(protected)/page.tsx:16-24`, `tickets/page.tsx:16-20`, `calendar/page.tsx:51-56`, `ordenes-trabajo/page.tsx:178-230`
- Qué se ve: cada página vuelve a filtrar `tickets`/`technicians` para obtener "activos", "críticos", "técnicos activos", con criterios ligeramente distintos entre sí.
- Dirección de refactor: exponer estos derivados ya calculados desde `AppContext` (que ya expone `getVisibleTickets`, `getSLACompliance`) o un hook `useTicketStats()`.

---

## 4. Estados innecesarios

### 4.1 — `AppContext` guarda 4 entidades en 4 `useState` separados que siempre cambian juntos
- Archivo: `src/context/AppContext.tsx:87-105, 299-361`
- Qué se ve: `tickets`, `technicians`, `workOrders`, `incompleteReports` solo se actualizan atómicamente dentro de `refreshData` (`Promise.all`), pero viven en 4 slices independientes, obligando a enumerar los 4 en cada arreglo de dependencias.
- Dirección de refactor: un solo `useState<{tickets, technicians, workOrders, incompleteReports}>` o `useReducer`.

### 4.2 — 6 `useState` para un mismo formulario de modal
- Archivo: `src/app/(protected)/tickets/[id]/page.tsx:95-101`
- Qué se ve: `showNCModal`, `ncReason`, `ncPhoto`, `ncPhotoName`, `ncSubmitting`, `ncError` — 6 slices que deben resetearse todos juntos en `openNCModal()`.
- Dirección de refactor: un `useReducer` o extraer el modal completo como componente con su propio estado local.

### 4.3 — Estado local que duplica una prop sin resincronizarse
- Archivo: `src/components/DocumentUploader.tsx:22-23`
- Qué se ve: `useState(documents)` copia la prop en estado local y la mantiene sincronizada manualmente; si el padre actualiza `documents` externamente, `localDocs` queda desfasado.
- Dirección de refactor: tratar el componente como controlado (usar `documents` directamente) o sincronizar con un `useEffect`.

### 4.4 — Variable computada y nunca usada
- Archivo: `src/app/login/page.tsx:35-37`
- Qué se ve: `remainingMin` se calcula dentro del `useEffect` de rate-limit pero nunca se usa en el mensaje de error mostrado (a diferencia del mismo cálculo en `submit()`, que sí lo usa).
- Dirección de refactor: interpolar `remainingMin` en el mensaje o eliminar el cálculo muerto.

---

## 5. Imports innecesarios

### 5.1 — Prop declarada, desestructurada y nunca leída
- Archivo: `src/components/SLAAlertBadge.tsx:3-9`
- Qué se ve: `timeRemainingPercent` está en la interfaz y se desestructura, pero nunca se usa en el cuerpo del componente (solo lo usa el componente hermano `SLAProgressBar`, con un prop de nombre distinto).
- Dirección de refactor: eliminar el prop no usado o conectar el `SLAProgressBar` si se pretendía mostrarlo.

### 5.2 — Import dinámico innecesario (ver también 1.4)
- Archivo: `src/lib/timeTracking.ts` — `await import('./supabase')` repetido 5 veces cuando ya hay import estático del mismo módulo.

### 5.3 — Dependencias de paquete usadas solo por código muerto
- Archivos: `package.json` — `jspdf`/`jspdf-autotable` (solo usadas por `src/lib/reportGenerator.ts`, sin importadores), `leaflet`/`react-leaflet` (solo usadas por `src/components/MapViewer.tsx`, sin importadores)
- Dirección de refactor: si se confirma el borrado de esos archivos (Fase 0), remover también las dependencias de `package.json`.

---

## 6. Archivos muertos (verificados con búsqueda real en `src/`)

| Archivo | Líneas aprox. | Estado | Nota |
|---|---|---|---|
| `src/lib/reportGenerator.ts` | 226 | Sin ningún importador | También arrastra `jspdf`/`jspdf-autotable` |
| `src/hooks/useNotifications.ts` | 56 | Sin ningún importador | Además tiene un bug de nombre de campo (`oldRecord`/`newRecord` en vez de `old`/`new`) que confirma que nunca se probó en ejecución |
| `src/lib/validationSchemas.ts` | 94 | Sin ningún importador | `CreateTicketForm.tsx` define su propio esquema duplicado bajo el mismo nombre en vez de importar este |
| `src/components/CreateTicketForm.tsx` | — | Sin ningún importador | Implementa un flujo de creación de tickets **completo pero incompatible** con el que realmente está enrutado (`tickets/new/page.tsx`) — campos y validación distintos |
| `src/components/AdminSLADashboard.tsx` | 343 | Sin ningún importador | Compite conceptualmente con `SLAMetricsPanel` (que sí está enrutado en `/admin/metricas-sla`) |
| `src/components/TechnicianSLAView.tsx` | 273 | Sin ningún importador | — |
| `src/components/MapViewer.tsx` | — | Sin ningún importador | Arrastra las dependencias `leaflet`/`react-leaflet` |
| `src/components/WorkPhotoCapture.tsx` | — | Sin ningún importador | Duplica funcionalidad de `EvidenceCapture.tsx` |
| `src/components/DocumentViewer.tsx` | — | Sin ningún importador | Nombre casi idéntico a `DocumentsViewer.tsx`, que sí está en uso — alto riesgo de confusión |
| `src/components/DocumentUploader.tsx` | — | Sin ningún importador | — |
| `src/app/(protected)/tickets/[id]/enhanced-page.tsx` | 227 | Ruta huérfana | Next.js App Router solo enruta archivos llamados `page.tsx`; este archivo nunca se sirve, pero **mantiene "vivos" artificialmente** a `EvidenceCapture.tsx` y `WorkTimeSummaryView.tsx` (sus únicos importadores) |
| `src/components/EvidenceCapture.tsx` | — | Vivo solo vía la ruta huérfana de arriba | Ver decisión pendiente abajo |
| `src/components/WorkTimeSummaryView.tsx` | — | Vivo solo vía la ruta huérfana de arriba | Ver decisión pendiente abajo |
| `src/app/(protected)/dashboard/page.tsx` | 175 | Ruta sin ningún enlace en toda la app | `AppShell.tsx` solo enlaza "Dashboard" hacia `/`, nunca hacia `/dashboard`; usa su propio motor de SLA (`slaCalculations.ts`) y su propia interfaz `Ticket` local, distinta a la de `domain.ts` |

**Exports muertos dentro de archivos que sí están vivos:**
- `src/lib/security.ts:206-334` — `PasswordValidation`, `SecurityHeaders`, `DataEncryption` (solo `LoginRateLimiter` y `SessionTimeoutManager` se usan realmente)
- `src/lib/sla.ts` — `calculateSLADeadline`, `calculateSLAStatus` se exportan pero solo se llaman internamente dentro del propio archivo

**Dos decisiones de producto pendientes antes de borrar (no son solo "borrar y listo"):**
1. **`enhanced-page.tsx`** — antes de eliminarlo, decidir si sus dos funcionalidades ausentes en la página real (`page.tsx`) — pestaña de "Resumen de Tiempos" (`WorkTimeSummaryView`) y pestaña de "Evidencias" (`EvidenceCapture`) — se quieren portar a la página real o se descartan junto con el archivo. Recomendación del agente que lo auditó: **no conservarlo "por si acaso"** — si se quiere la funcionalidad, portarla explícitamente como cambio propio y luego borrar el archivo.
2. **`CreateTicketForm.tsx`** — antes de eliminarlo, confirmar que no representa una versión más nueva/deseada del formulario de creación de tickets que simplemente no se terminó de conectar. Si `tickets/new/page.tsx` es la versión vigente, este archivo se borra sin más.

**Impacto total estimado de la Fase 0:** ~2.500+ líneas de código eliminables sin tocar ningún comportamiento actualmente en uso, más 2 dependencias de npm removibles.

---

## 7. Funciones duplicadas

### 7.1 — `calculateSLACompliance` existe tres veces con tres firmas distintas
- Archivos: `sla.ts:72-100` (`{total, compliant, percentage}`), `slaCalculations.ts:57-77` (retorna un `number` plano), `slaMetrics.ts:148-183` (`{total, compliant, percentage, critical, warning}`)
- Dirección de refactor: una sola función tras la Fase 1.

### 7.2 — "Buscar tickets críticos" y "agrupar por estado SLA" duplicados
- Archivos: `slaCalculations.ts:80-101` (`getCriticalAlerts`) vs `slaMetrics.ts:188-194` (`getCriticalTickets`); `sla.ts:105-115` (`groupTicketsBySLAStatus`) vs `slaMetrics.ts:199-214` (`groupTicketsBySLA`)
- Dirección de refactor: fusionar en el módulo único de la Fase 1.

### 7.3 — Dos formateadores de duración distintos
- Archivos: `timeTracking.ts:399-418` (`formatDuration`) vs `slaMetrics.ts:219-231` (`formatSLATime`)
- Dirección de refactor: un único formateador compartido por temporizador y SLA.

### 7.4 — Dos caminos de escritura hacia `work_orders` con formas incompatibles
- Archivos: `repository.ts:280-291` (`createWorkOrder`, forma completa de `WorkOrder`) vs `timeTracking.ts:242-257` (insert manual dentro de `completeWorkTimer`, con un subconjunto mínimo de campos)
- Qué se ve: `getWorkOrders` castea lo que vuelve de Supabase como `WorkOrder[]` sin validar, así que las filas creadas por `completeWorkTimer` quedan tipadas como `WorkOrder` completo en la UI aunque les falten casi todos los campos.
- Dirección de refactor: que `completeWorkTimer` reutilice `repository.createWorkOrder` en vez de insertar directamente.

---

## 8. Malos nombres

| Hallazgo | Archivo(s) |
|---|---|
| `DocumentViewer` (singular, sin uso) vs `DocumentsViewer` (plural, en uso) vs `DocumentUploader` — la diferencia singular/plural no comunica ninguna diferencia real de responsabilidad | `src/components/Document*.tsx` |
| `MetricCard` acepta `title`/`label` y `hint`/`trendValue` como pares "sinónimos" sin que quede claro cuál es la convención vigente | `src/components/MetricCard.tsx:6-33` |
| `EvidenceCapture` y `WorkPhotoCapture` — nombres que no distinguen su alcance real (uno tiene firma, el otro reverse-geocoding) | `src/components/*.tsx` |
| `enhanced-page.tsx` sugiere ser la versión "mejorada", cuando en realidad es un prototipo huérfano no enrutado | `src/app/(protected)/tickets/[id]/enhanced-page.tsx` |
| Dos archivos exportan un componente con el mismo nombre `DashboardPage` | `src/app/(protected)/page.tsx:13`, `dashboard/page.tsx:22` |
| `config_visual` en snake_case dentro de un archivo por lo demás camelCase | `src/lib/slaMetrics.ts:98` |
| `SLA_CONFIG.timeWindow` almacena minutos pero el nombre no lleva unidad y el comentario dice "horas" | `src/lib/slaMetrics.ts:7-26` |
| `WorkOrder` mezcla nombres de campo en inglés (`tech_name`, `documents`) y español (`cliente_nombre`, `problematica`) dentro de la misma interfaz, y además tiene `uploadedAt` y `uploaded_at` simultáneamente en `photos` | `src/types/domain.ts:64-116` |

---

## 9. Problemas SOLID

### 9.1 — Single Responsibility violado en múltiples módulos grandes
Ver la tabla completa en la sección 2 (`repository.ts`, `security.ts`, `SLAMetricsPanel.tsx`, `AdminAnalyticsDashboard.tsx`, `WorkTimer.tsx`, `tickets/[id]/page.tsx`).

### 9.2 — Open/Closed violado por mapas de color hardcodeados por status literal
- Archivos: `SLABadge.tsx:10-26`, `SLAIndicator.tsx:37-66`, `SLAVisualizer.tsx:73-79`
- Qué se ve: cada uno define su propio objeto `{ healthy: {...}, warning: {...}, critical: {...} }` — agregar un nuevo nivel de estado obliga a modificar cada archivo en vez de extender una configuración central.

### 9.3 — Dependency Inversion: nombres de tabla de Supabase esparcidos sin abstracción
- Archivos: `repository.ts` y `timeTracking.ts` — ambos llaman `supabase.from('tickets')`/`supabase.from('work_orders')` de forma independiente con sus propias listas de columnas inline.
- Dirección de refactor: un módulo de acceso a datos por tabla (o un wrapper genérico `table<T>(name)`) usado por ambos archivos.

### 9.4 — Interface Segregation en `MetricCard`
- Archivo: `MetricCard.tsx:4-24` — 9 props opcionales, cada consumidor usa un subconjunto distinto con convención de nombres distinta.

### 9.5 — Camino de escritura inconsistente (algunas mutaciones van por API route, la mayoría no)
- Archivo: `AppContext.tsx:184-297` — `editTicketHandler` intenta primero `fetch('/api/tickets/[id]')` y cae a la escritura directa si falla; `addTicket`/`addTechnician`/`addWorkOrder`/`addIncompleteReport` van directo al repositorio sin ningún intento de pasar por una API route.
- Dirección de refactor: elegir una sola estrategia de persistencia y aplicarla de forma consistente a todos los handlers.

### 9.6 — Política de visibilidad de negocio embebida en el contexto en vez de vivir en `src/lib`
- Archivo: `AppContext.tsx:316-340` — `getVisibleTickets`/`getAvailableTickets`/`getCompletedTickets` inlinean la regla de negocio de "qué ve cada rol" directamente en el provider, contradiciendo la propia regla del proyecto de mantener la lógica de política en `src/lib`.
- Dirección de refactor: mover a `src/lib/ticketVisibility.ts` como funciones puras `(tickets, user) => Ticket[]`.

---

## 10. Problemas DRY

(Los duplicados de lógica ya están cubiertos arriba; aquí se listan solo los casos de **constantes de negocio** redefinidas.)

### 10.1 — Umbrales de SLA/eficiencia hardcodeados en 4+ lugares en vez de una sola constante
Ver sección 1.11 — cuatro pares de umbrales distintos para conceptos comparables, ninguno importado de `SLA_CONFIG` (que ya existe en `slaMetrics.ts`).

### 10.2 — Tres tablas de horas de SLA con valores mutuamente inconsistentes
- Archivos: `domain.ts:48-52` (`SLA_HOURS` por prioridad: 2/8/24h), `slaCalculations.ts:15-19` (por prioridad: 4/24/48h), `slaMetrics.ts:7-26` (por tipo de ticket: 2h/5h/3h — la única que coincide con la política de negocio documentada).

### 10.3 — Locale de fecha hardcodeado de forma distinta por archivo
Ver sección 1.12.

---

## 11. Problemas KISS

### 11.1 — Expresión que se auto-cancela en `calculateSLAStatus`
- Archivo: `src/lib/sla.ts:36-39`
```
const totalMs = deadlineDate.getTime() - new Date(deadline).getTime() + (now.getTime() - deadlineDate.getTime());
```
- Qué se ve: el primer término resta el mismo valor parseado dos veces (siempre 0); el resultado real de `totalMs` es opaco sin álgebra manual.
- Dirección de refactor: reemplazar por `deadlineDate.getTime() - createdDate.getTime()` recibiendo la fecha de creación como parámetro, igual que ya hacen `slaCalculations.ts`/`slaMetrics.ts`.

### 11.2 — Algoritmo de dedup de dos pasadas para lo que es fundamentalmente un merge de dos listas
- Archivo: `src/lib/repository.ts:84-181` — `scoreTicketCompleteness` + `getTicketSemanticKey` + `dedupeTickets`, con una comparación de igualdad por `JSON.stringify` (frágil ante cambios de orden de claves).
- Dirección de refactor: simplificar a un merge por id (`{...byId(remote), ...byId(local)}`); si existe un caso real de duplicados sin id coincidente, documentarlo explícitamente para justificar la complejidad adicional.

### 11.3 — `useSLAAlerts` recalcula SLA desde cero en vez de leer `ticket.sla_status` ya calculado
- Archivo: `src/hooks/useSLAAlerts.ts:20-24`
- Qué se ve: cada ticket que sale del repositorio ya trae `sla_status` calculado (`enrichTicketWithSLA`), pero este hook vuelve a calcularlo con un cuarto motor SLA distinto en vez de leer el valor existente.
- Dirección de refactor: una vez unificado el motor SLA, este hook solo debería observar transiciones de `ticket.sla_status`, no recalcularlo.

### 11.4 — Manipulación manual de eventos de canvas en vez de un patrón declarativo de React
- Archivo: `src/components/EvidenceCapture.tsx:107-144, 291`
- Qué se ve: `setupSignaturePad` asigna `canvas.onmousedown/onmousemove/onmouseup` mutando el DOM directamente, invocado desde un atributo `onLoad` en el `<canvas>` que no es un evento estándar confiable para ese elemento (por eso, de hecho, el pad de firma no funciona hoy).
- Dirección de refactor: usar handlers React estándar (`onMouseDown`/`onMouseMove`/`onMouseUp`) directamente en el JSX, o extraer `useSignaturePad(canvasRef)`.

---

## Checklist de verificación posterior (para cuando se ejecute cada fase)

- [ ] Tras Fase 0: confirmar que `npm run build` sigue pasando y que ninguna ruta real quedó rota tras borrar archivos.
- [ ] Tras Fase 1: verificar manualmente que el mismo ticket muestra el mismo estado SLA en Dashboard, Tickets, Calendario, Órdenes de Trabajo y Métricas SLA simultáneamente.
- [ ] Tras Fase 2: verificar visualmente que los componentes SLA/Documentos consolidados se ven igual (o mejor) en todas las pantallas donde antes había una variante distinta.
- [ ] Tras Fase 3-5: correr lint/typecheck y revisar que ningún prop/nombre legacy quedó huérfano tras las consolidaciones.

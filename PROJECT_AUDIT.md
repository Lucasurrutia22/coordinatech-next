# PROJECT_AUDIT.md — Auditoría Integral de CoordinaTech

**Fecha:** 2026-07-03
**Alcance:** Todo el repositorio (`src/`, `supabase/`, configuración de proyecto). Solo lectura — ningún archivo de código fue modificado.
**Metodología:** Auditoría multi-rol ejecutada por 7 agentes especializados en paralelo, cada uno leyendo el código fuente real (no solo nombres de archivo/inferencia): Software Architect, Senior Next.js Engineer, React Expert, UX Designer (UI/Accesibilidad/SEO/Responsive), QA Engineer, Security Engineer, Performance Engineer, Product Owner. Se consultaron las skills instaladas relevantes (`next-best-practices`, `react-best-practices`, `supabase-postgres-best-practices`, `supabase`, `cache-components`, `frontend-design`, `web-design-guidelines`, `kpi-dashboard-design`, `nextjs-seo`) como línea base de buenas prácticas. Los hallazgos duplicados entre roles se consolidaron en una sola entrada citando todas las perspectivas que lo confirmaron.

**Stack verificado:** Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript 5 (`strict: true`) + Supabase JS v2 + Tailwind v4 + Zod. Sin framework de testing configurado (`package.json` solo tiene `dev/build/start/lint`). Sin `middleware.ts`. `next.config.ts` completamente por defecto. No es un repositorio git (`git init` no ejecutado).

---

## Resumen ejecutivo

| Severidad | Cantidad | Significado |
|---|---|---|
| 🔴 Crítico | 11 | Rompe una regla de negocio central, expone datos/credenciales, o bloquea el uso real del producto |
| 🟠 Alto | 14 | Riesgo serio de seguridad, integridad de datos o UX que debe resolverse antes de producción |
| 🟡 Medio | 17 | Deuda técnica, inconsistencias o gaps que degradan calidad/mantenibilidad |
| 🟢 Bajo | 10 | Pulido, buenas prácticas menores, oportunidades de mejora |

**El problema sistémico #1**, confirmado independientemente por los 7 roles: la lógica de SLA — la propuesta de valor central del producto — está implementada **hasta cinco veces** de forma contradictoria (`src/lib/sla.ts`, `src/lib/slaCalculations.ts`, `src/lib/slaMetrics.ts`, más helpers ad-hoc en `tickets/[id]/page.tsx` y `ordenes-trabajo/page.tsx`). Solo `slaMetrics.ts` implementa la regla documentada (ST=2h/INS=5h/RT=3h por `ticket_type`), y sus componentes consumidores (`AdminSLADashboard`, `TechnicianSLAView`, `SLAVisualizer`) **no están enrutados en ninguna página real** — son código muerto. Lo que sí ve un usuario real usa `priority` en vez de `ticket_type`, con números que no coinciden entre pantallas, y uno de los motores (`sla.ts`) tiene un bug matemático que hace que **todo ticket activo se muestre como "critical"**.

**El problema sistémico #2**: no existe un límite de seguridad real. La autenticación es una comparación de strings en el cliente contra una tabla `technicians` completamente legible por cualquier visitante anónimo (RLS con `using (true)` en todas las tablas, y RLS *deshabilitado por completo* en `work_time_logs`/`work_breaks`/`work_orders`). Las contraseñas se guardan en texto plano, y la contraseña de admin junto con el código "2FA" están embebidos en el bundle público vía variables `NEXT_PUBLIC_*`.

**El problema sistémico #3**: hay una cantidad significativa de código construido y luego nunca conectado — `enhanced-page.tsx` (una segunda implementación completa del detalle de ticket que Next.js nunca enruta), `EvidenceCapture.tsx`/`WorkPhotoCapture.tsx` (captura de evidencia fotográfica/GPS, requisito de negocio documentado, inalcanzable en producción), `MapViewer.tsx`, `AdminSLADashboard.tsx`, `TechnicianSLAView.tsx`, un segundo dashboard huérfano en `/dashboard`, y hooks de notificaciones en tiempo real sin usar. Esto sugiere migraciones/features abandonadas a medio camino, no simple "código de más".

---

## 🔴 Críticos

### C1 — Sin autenticación real: cualquier visitante puede leer credenciales y suplantar a cualquier técnico
**Categoría:** Seguridad / Supabase / Base de datos
**Roles que lo confirmaron:** Security, Architect
- `src/context/AppContext.tsx:83-94,129-166` — el login es `allTechs.find(item => item.email === email && item.password === password)`, una comparación de texto plano en el cliente.
- La lista completa de técnicos (incluyendo `password`, campo `text not null` en `supabase/schema.sql:6`) se descarga en cada carga de la app — incluso en `/login`, antes de autenticar — porque `AppProvider` envuelve todo `RootLayout` (`src/lib/repository.ts:32-57`, política `technicians_public_select ... to anon using (true)` en `schema.sql:32-37`).
- **Impacto:** cualquier visitante anónimo puede abrir DevTools o llamar directamente al endpoint REST de Supabase con la clave anon (también pública) y leer todas las contraseñas en texto plano, o autenticarse como cualquier técnico.

### C2 — Row Level Security es un placebo; una migración la deshabilita directamente
**Categoría:** Supabase / Base de datos / Seguridad
**Roles que lo confirmaron:** Security, Architect, QA
- Todas las políticas RLS reales en `supabase/schema.sql:32-74`, `migration_work_orders.sql:31-39`, `migration_documents.sql:27-37`, `migration_work_photo_gps.sql:25-30`, `migration_incomplete_reports.sql:29-37` son `to anon using (true) with check (true)` — sin scoping por rol o identidad.
- `supabase/migration_fix_rls_work_timer.sql:1-11` **deshabilita RLS por completo** (`disable row level security`) en `work_time_logs`, `work_breaks`, `work_orders` — nombrada como si corrigiera un bug, en realidad elimina la protección.
- **Impacto:** cualquier actor con la clave anon (embebida en el bundle público) puede leer/escribir tickets, técnicos, órdenes de trabajo, evidencia fotográfica/firma/GPS y registros de tiempo de cualquier persona, sin restricción alguna, saltándose por completo la app Next.js.

### C3 — Motor de SLA triplicado/quintuplicado y contradictorio; la regla de negocio documentada (ST 2h/INS 5h/RT 3h) no rige en producción
**Categoría:** Arquitectura / Dashboard / Producción / Tipado
**Roles que lo confirmaron:** Architect, Next.js/React, QA, UX, Product Owner (los 5)
- `src/lib/sla.ts` calcula por **prioridad** (`high=2h, medium=8h, low=24h`) — usado por `repository.ts` (`enrichTicketWithSLA`, corre en cada fetch/create/update de ticket) y `AppContext.tsx` → alimenta el dashboard principal y las listas de tickets.
- `src/lib/slaCalculations.ts` también por prioridad pero con **otros números** (`low=48h, medium=24h, high=4h`) — usado por `/dashboard`, `useSLAAlerts`, `SLAIndicator`, `SLAMetricsPanel` (`/admin/metricas-sla`).
- `src/lib/slaMetrics.ts` es el **único** motor correcto, por `ticket_type` (ST=2h/INS=5h/RT=3h) — pero sus consumidores (`AdminSLADashboard`, `TechnicianSLAView`, `SLAVisualizer`) **no están importados por ninguna ruta real** (código muerto).
- Helpers ad-hoc adicionales en `tickets/[id]/page.tsx:68-87` y `ordenes-trabajo/page.tsx:26-42`, basados en `scheduled_date`, ignorando tipo/prioridad por completo.
- El panel `/admin/metricas-sla` incluso imprime en pantalla "Alta: 4 horas, Media: 24 horas, Baja: 48 horas" como si fuera la política oficial — no coincide con CLAUDE.md ni con ningún otro motor.
- **Impacto:** el mismo ticket puede mostrarse "OK" en una pantalla y "crítico/vencido" en otra, al mismo tiempo. Una Instalación (presupuesto real 5h) puede marcarse CRÍTICA en 2-4h; un Soporte Técnico (presupuesto real 2h) puede tratarse como si tuviera 24-48h. El "SLA-first ticket lifecycle" que es la propuesta de valor del producto no está implementado de forma consistente en ningún flujo real.

### C4 — `sla.ts` tiene un bug matemático: todo ticket activo se calcula como "critical"
**Categoría:** Base de datos / Tipado / Producción
**Roles que lo confirmaron:** QA
- `src/lib/sla.ts:36-47`: `totalMs = deadlineDate.getTime() - new Date(deadline).getTime() + (now.getTime() - deadlineDate.getTime())` — el primer término resta el mismo valor parseado dos veces (siempre 0), así que `totalMs` colapsa a `now - deadlineDate`, que es `≤ 0` en la rama donde se ejecuta este cálculo (tickets no vencidos). `remainingPercent = remainingMs / totalMs` termina siendo siempre `≤ 0`, por lo que la función nunca puede devolver `"healthy"` o `"warning"` — **siempre retorna `"critical"`**.
- **Impacto:** esta es la función que corre en `enrichTicketWithSLA`, el path de datos principal de toda la app (`repository.getTickets`/`getTicketById`). Todo ticket recién creado y saludable se muestra como "crítico" en el dashboard y en `AppContext.getSLACompliance()`, generando fatiga de alertas y un % de cumplimiento SLA completamente falso.

### C5 — Validación de transición de estado del ticket se bypasea silenciosamente ante cualquier error
**Categoría:** CRUD / Validaciones / Permisos
**Roles que lo confirmaron:** QA, Next.js/React
- `src/context/AppContext.tsx:203-227` (`editTicketHandler`): el `fetch` al endpoint `PATCH /api/tickets/[id]` (que sí implementa correctamente una máquina de estados en `src/app/api/tickets/[id]/route.ts:30-45`) y el manejo de `!response.ok` están en el **mismo bloque `try`**. Un rechazo legítimo (HTTP 409 por transición ilegal) es indistinguible de "la API no está disponible" — en ambos casos cae al `catch`, que solo hace `console.warn` y llama a `updateTicket()` directamente, **sin ninguna validación**.
- **Impacto:** la única protección real contra transiciones de estado ilegales (p. ej. saltar directo a "completed") es efectivamente un no-op — cualquier rechazo del servidor se reintenta sin validar por la vía de respaldo.

### C6 — El cierre de ticket ("Completar Orden de Soporte") no exige evidencia real; los campos se hardcodean
**Categoría:** CRUD / Formularios / Validaciones / Producción
**Roles que lo confirmaron:** QA
- `src/app/(protected)/tickets/[id]/orden-soporte/page.tsx:96-121`: los únicos tres campos de formulario (`cliente_nombre`, `cliente_local`, `solucion`) están marcados "(opcional)" sin `required` ni validación. El resto se hardcodea: `pruebas: "Completadas en terreno"`, `supervisor_nombre: "Sistema"`, `recibe_nombre: "Cliente"`, `rating: 5`, `razon_calificacion: "Trabajo completado exitosamente"`. `editTicket(ticket.id, { status: "completed" })` se dispara inmediatamente, antes de que el usuario interactúe con la ventana externa de Zoho (abierta 1.5s después).
- **Impacto:** un técnico puede cerrar cualquier ticket dejando los tres campos en blanco, generando una orden de trabajo fabricada (calificación 5/5 falsa, firmas falsas) sin evidencia fotográfica real — cumpliendo la regla de negocio "cierre vía orden de trabajo" solo de nombre, sin ninguna exigencia real.

### C7 — Captura de evidencia fotográfica/GPS es código muerto: el requisito de negocio no está implementado en producción
**Categoría:** Componentes repetidos / Código muerto / Producción / Navegación
**Roles que lo confirmaron:** QA, UX, Product Owner, Next.js/React, Architect (los 5)
- `src/components/EvidenceCapture.tsx` y `src/components/WorkPhotoCapture.tsx` solo se importan desde `src/app/(protected)/tickets/[id]/enhanced-page.tsx`. Next.js App Router únicamente enruta archivos llamados exactamente `page.tsx` — `enhanced-page.tsx` **nunca se sirve como ruta** y ningún otro archivo lo importa (confirmado por búsqueda en todo el repo).
- **Impacto:** el flujo de cierre real (`tickets/[id]/page.tsx` → `orden-soporte/page.tsx`) no tiene ningún paso de captura de foto/GPS. La regla de negocio "el trabajo puede incluir evidencia fotográfica" no existe en el código realmente accesible por un usuario.

### C8 — El rol "Supervisor" está documentado como obligatorio pero no existe en el sistema
**Categoría:** Permisos / Tipado / Producción
**Roles que lo confirmaron:** QA, Product Owner
- `src/types/domain.ts:1`: `export type UserRole = "admin" | "tech";` — no hay ningún valor `supervisor`, ruta, lógica de permisos o vista de equipo/reporting en todo el repo. La única coincidencia de la palabra "supervisor" es `WorkOrder.supervisor_nombre`, un campo de texto libre (nombre de una persona en el formulario), sin relación con roles de la aplicación.
- **Impacto:** uno de los tres roles documentados en CLAUDE.md ("Supervisor: team/reporting scope") no tiene ninguna implementación — ni login, ni permisos, ni vista.

### C9 — Contraseña de admin y código "2FA" embebidos en el bundle público del cliente
**Categoría:** Seguridad
**Roles que lo confirmaron:** Security
- `src/context/AppContext.tsx:51-61` y `src/app/login/page.tsx:61-89`: `ADMIN_EMAIL`/`ADMIN_PASSWORD` provienen de `NEXT_PUBLIC_ADMIN_EMAIL`/`NEXT_PUBLIC_ADMIN_PASSWORD`, y el código de "2FA" de `NEXT_PUBLIC_DEMO_2FA_CODE` (con fallback hardcodeado `"123123"`). El prefijo `NEXT_PUBLIC_` hace que Next.js incluya estos valores literalmente en el JavaScript compilado.
- **Impacto:** cualquiera puede inspeccionar el bundle compilado y extraer tanto la contraseña real de admin como el código exacto de 2FA — ambos factores de autenticación del login de admin son cosméticos.

### C10 — IDOR / sin autorización en `/api/tickets/[id]`
**Categoría:** Seguridad / Permisos / CRUD
**Roles que lo confirmaron:** Security, QA
- `src/app/api/tickets/[id]/route.ts:6-19,51-137`: `PATCH`/`GET` solo validan `isSameOrigin(request)`, que además **retorna `true` cuando el header `Origin` está ausente** — el caso común para llamadas directas (curl, servidor a servidor). No hay verificación de sesión, cookie, JWT, ni de que el llamador sea el técnico asignado o un admin.
- **Impacto:** cualquier actor no autenticado puede hacer `PATCH` a cualquier ticket por ID — reasignar técnico, cambiar prioridad, fecha, estado — sin credenciales. Es un IDOR clásico combinado con un chequeo CSRF que falla abierto.

### C11 — Segundo dashboard huérfano sin filtrado por rol, inalcanzable desde la navegación
**Categoría:** Navegación / Dashboard / Permisos / Código muerto
**Roles que lo confirmaron:** Architect, Next.js/React, UX
- `src/app/(protected)/dashboard/page.tsx` (ruta `/dashboard`) es una implementación completa y separada del dashboard real (`src/app/(protected)/page.tsx`, ruta `/`, la única enlazada desde `AppShell.tsx`). Consulta Supabase directamente sin pasar por `AppContext`, nunca llama a `getVisibleTickets` (por lo que **no filtra por rol** — un técnico vería todos los tickets del sistema si llegara a esta URL), usa un tercer tipo `Ticket` incompatible, e intenta autenticar vía `supabase.auth.getUser()` — que siempre devuelve `null` porque la app nunca crea sesiones reales de Supabase Auth (el login es manual contra la tabla `technicians`).
- **Impacto:** ruta viva, no enlazada pero accesible por URL directa, que expone todos los tickets sin control de acceso y con lógica de SLA divergente (otro más de los motores de la C3).

---

## 🟠 Altos

### A1 — Migraciones de Supabase inconsistentes, algunas con SQL inválido o irreproducible
**Categoría:** Supabase / Base de datos / Arquitectura
**Roles:** Architect
- `migration_time_tracking.sql` y `migration_time_tracking_LIMPIO.sql` declaran `work_time_logs.ticket_id UUID REFERENCES tickets(id)` — pero `tickets.id` es `TEXT PRIMARY KEY` en `schema.sql:1-9` (Postgres rechazaría este FK). `_LIMPIO.sql` además usa sintaxis inválida (`ALTER TABLE ADD COLUMN ... COMMENT '...'`, no válido en Postgres) y políticas RLS basadas en una columna `tenant_id` que no existe en ningún lado del esquema. `migration_time_tracking_EJECUTADA.sql` es casi solo comentarios, sin SQL ejecutable real. Solo `migration_work_timer.sql` coincide con lo que `timeTracking.ts` realmente usa.
- **Impacto:** reconstruir el esquema en un entorno nuevo (staging, disaster recovery) es altamente propenso a fallar — 2 de los 4 archivos candidatos para esta feature no son SQL válido ejecutable contra el esquema real.

### A2 — `repository.ts` trata `localStorage` como fuente de verdad, contradiciendo la regla "Supabase es la fuente de verdad"
**Categoría:** Arquitectura / Base de datos / CRUD
**Roles:** QA, Architect
- Comentario explícito en el código: `// Prioridad: retornar almacenamiento local como fuente de verdad`. `updateTicket()` atrapa errores de escritura a Supabase y solo hace `console.warn` ("No relanzar el error aquí: los cambios ya están en almacenamiento local").
- **Impacto:** dos usuarios en dispositivos distintos pueden terminar con vistas permanentemente divergentes del mismo ticket, sin reconciliación; una escritura fallida a Supabase es invisible para el usuario (la UI reporta éxito local mientras el backend nunca recibió el cambio).

### A3 — Validación de creación de tickets: tres esquemas Zod divergentes, dos muertos, el flujo real sin validación real
**Categoría:** Formularios / Validaciones / Código muerto
**Roles:** QA, Architect
- `src/lib/validationSchemas.ts` no se importa en ningún lugar de la app. `src/components/CreateTicketForm.tsx` define su propio esquema Zod distinto (y también está huérfano — nunca importado por ninguna página). La página real y enrutada, `tickets/new/page.tsx`, no usa ningún esquema Zod — solo atributos HTML `required` nativos, sin chequeo de longitud/formato, y `priority`/`technician_id` ni siquiera son `required`.
- **Impacto:** el formulario de creación de tickets realmente accesible no tiene validación significativa más allá de "campo no vacío" en algunos inputs.

### A4 — `RoleGuard` no protege las rutas `/admin/*`; un técnico puede navegar directo por URL
**Categoría:** Permisos / Navegación
**Roles:** QA
- `src/components/RoleGuard.tsx:13-26` solo redirige cuando `user.role === "tech" && pathname.startsWith("/technicians")`. No hay chequeo para `/admin/analytics` ni `/admin/metricas-sla` — ambas páginas renderizan sus dashboards incondicionalmente. Tampoco existe `middleware.ts` en todo el proyecto.
- **Impacto:** un técnico autenticado puede escribir `/admin/analytics` en la barra de direcciones y ver KPIs globales de todos los técnicos, violando la regla de visibilidad por rol.

### A5 — Credenciales de técnico en texto plano, contraseña por defecto débil y committeada
**Categoría:** Seguridad / Base de datos
**Roles:** Security, QA
- `Technician.password: string` sin hash en ningún punto del flujo de login (`AppContext.tsx:147-148`, comparación `===`). `supabase/seed.sql:5` commitea una contraseña real (`tech123`) junto a un email con apariencia real. El formulario de creación de técnicos (`technicians/new/page.tsx:15`) pre-rellena `"tech123"` como contraseña por defecto, sin forzar cambio.
- **Impacto:** cualquier acceso de lectura a la tabla/caché (ya trivial por C1/C2) expone contraseñas en claro; la contraseña por defecto predecible es un vector fácil de toma de cuenta.

### A6 — `/api/send-email` es un relay de correo abierto sin autenticación
**Categoría:** Seguridad
**Roles:** Security
- `src/app/api/send-email/route.ts` usa el mismo chequeo `isSameOrigin` que falla abierto (C10), acepta `to`/`subject`/`htmlContent` arbitrarios del llamador, y los reenvía como email HTML desde la identidad del dominio de la empresa si hay `RESEND_API_KEY`/`SENDGRID_API_KEY` configurada. Sin rate limiting.
- **Impacto:** si hay credenciales de email configuradas, el endpoint puede usarse como relay de spam/phishing con remitente `@coordinatech.com`.

### A7 — Toda la aplicación es cliente-renderizada; sin Server Components con datos, sin `middleware.ts`
**Categoría:** Next.js / React / Arquitectura
**Roles:** Next.js/React, Security, QA
- De los 15 `page.tsx` bajo `(protected)` más login/forgot-password, 39 de 41 archivos empiezan con `"use client"`. Los únicos Server Components (`layout.tsx` raíz y de `(protected)`) son pass-throughs triviales sin fetching. No hay `middleware.ts` que intercepte requests antes de servir el bundle.
- **Impacto:** cada ruta paga un waterfall de "cargar JS → luego hacer fetch" en vez de HTML servido con datos ya embebidos; el "gate" de acceso (`RoleGuard`) solo actúa después de que el bundle completo ya se descargó y ejecutó, no a nivel de borde/servidor.

### A8 — Segunda implementación completa y divergente del detalle de ticket, código muerto de ~230 líneas
**Categoría:** Componentes repetidos / Código muerto / Producción
**Roles:** Next.js/React, Product Owner, Architect
- `src/app/(protected)/tickets/[id]/enhanced-page.tsx` (226 líneas) coexiste con la página real `tickets/[id]/page.tsx` (605 líneas). Implementa su propio tipo `Ticket`, su propio cálculo de SLA (un motor más), su propia UI con tabs, e interactúa con Supabase directamente sin pasar por `AppContext`/`updateTicket`. No tiene ningún enlace al flujo de orden de trabajo.
- **Impacto:** evidencia concreta de una migración/rediseño abandonado en el repo de producción; riesgo de que un futuro desarrollador la reconecte creyendo que es la versión "mejorada".

### A9 — Múltiples componentes construidos y completamente desconectados de cualquier ruta
**Categoría:** Componentes repetidos / Código muerto
**Roles:** Next.js/React, Architect, UX, Product Owner
- `WorkPhotoCapture.tsx`, `TechnicianSLAView.tsx`, `AdminSLADashboard.tsx`, `MapViewer.tsx`, `SLAVisualizer.tsx`, `DocumentViewer.tsx`, `DocumentUploader.tsx`, `WorkTimeSummaryView.tsx` (solo alcanzable vía la ruta muerta de A8), `reportGenerator.ts` (exportación PDF nunca invocada desde ningún botón/menú), `useNotifications.ts` (hooks de notificaciones realtime, nunca usados, y con un bug de shape de payload — `oldRecord`/`newRecord` en vez de `old`/`new` de Supabase v2).
- **Impacto:** representa una cantidad sustancial de esfuerzo de ingeniería (incluida la única implementación correcta de SLA y de captura de evidencia) que nunca llegó a un usuario real.

### A10 — El panel `/admin/metricas-sla` muestra una política de SLA incorrecta como si fuera oficial
**Categoría:** Dashboard / Producción
**Roles:** UX, Product Owner
- `src/app/(protected)/admin/metricas-sla/page.tsx:44-49` renderiza un cuadro fijo "Reglas de servicio: Alta 4h, Media 24h, Baja 48h" — los números de `slaCalculations.ts`, que no coinciden con la política documentada (ST 2h/INS 5h/RT 3h) ni con ningún otro motor.
- **Impacto:** decisiones operativas o de escalamiento tomadas desde esta pantalla se basan en una política fabricada, comunicada directamente a los administradores como si fuera la fuente de verdad.

### A11 — Datos demo pueden filtrarse a la experiencia real de producción sin distinción visual
**Categoría:** Producción / Base de datos
**Roles:** Product Owner
- `src/lib/repository.ts` usa `demoTickets`/`demoTechnicians` (`src/lib/demoData.ts`) como fallback cuando `localStorage` está vacío, `hasSupabaseEnv` es falso, o la llamada a Supabase falla/excede el timeout de 5s. Los registros ficticios se escriben en `localStorage` y se mezclan con datos reales sin ninguna bandera o aviso.
- **Impacto:** una caída transitoria de Supabase o una mala configuración de variables de entorno puede poblar silenciosamente la lista de tickets de un técnico real con datos ficticios indistinguibles de asignaciones reales.

### A12 — Historial de pausas/breaks se persiste pero no es visible ni exportable en ningún flujo real
**Categoría:** Producción / CRUD
**Roles:** Product Owner
- Las razones y duración de pausas se escriben vía `timeTracking.ts`/`WorkTimer.tsx`, pero el único componente que las renderiza (`WorkTimeSummaryView`) solo es importado por la ruta muerta `enhanced-page.tsx` (A8). `reportGenerator.ts` (exportación PDF) nunca se invoca desde ningún botón, y su `ReportData` ni siquiera incluye campos de pausas/breaks.
- **Impacto:** la regla de negocio "las pausas deben ser reportables" se cumple solo a medias — se persisten, pero ningún admin/supervisor/auditor puede verlas o exportarlas hoy.

### A13 — Flujo de cierre vía Zoho usa `window.open()` dentro de un `setTimeout`, bloqueado por navegadores móviles
**Categoría:** UX / Formularios / Responsive
**Roles:** UX
- `src/app/(protected)/tickets/[id]/orden-soporte/page.tsx:126-149`: la apertura de la ventana externa ocurre en un callback diferido 1.5s después del clic, rompiendo la cadena síncrona de gesto de usuario que exigen Safari/Chrome móviles para permitir popups.
- **Impacto:** en técnicos de campo trabajando desde el celular, el formulario externo de Zoho (que captura pruebas, calificación y firma del cliente) probablemente nunca se abre, sin un fallback nativo confiable dentro de la app.

### A14 — Los técnicos no ven el cronómetro que ellos mismos operan
**Categoría:** UX / Accesibilidad
**Roles:** UX
- `src/components/WorkTimer.tsx:189-203`, usado siempre en modo `compact`: el tiempo transcurrido y el motivo de pausa activo solo se muestran si `userRole === 'admin'`. El rol real de un técnico es `"tech"`, por lo que esta condición siempre es falsa para ellos — solo ven botones de Iniciar/Pausar/Reanudar, sin retroalimentación de tiempo.
- **Impacto:** la persona que realiza el trabajo de campo cronometrado no puede ver cuánto tiempo ha transcurrido ni qué motivo de pausa está activo, socavando la trazabilidad del timer justo para el rol que más la necesita.

---

## 🟡 Medios

### M1 — Timer/polling storm: un `setInterval` de 1 segundo por cada fila de ticket, más polling global cada 10s sin límite ni filtro
**Categoría:** Performance
**Roles:** Performance
- `src/components/SLAIndicator.tsx:24-33` crea su propio `setInterval(1000ms)` **por instancia**, renderizado una vez por fila en listas de tickets. `AppContext.tsx:120-127` además hace `refreshData()` con `select("*")` sin `.limit()` cada 10 segundos, para las 4 entidades principales, arrancando incluso en `/login` (antes de autenticar) porque `Providers`/`AppProvider` envuelve todo `RootLayout`.
- **Impacto:** con 100 tickets visibles, son ~100 timers independientes por segundo, más una descarga completa de tablas cada 10s por cada pestaña abierta — incluyendo visitantes anónimos en el login.

### M2 — N+1 queries y falta de índices en los filtros más usados
**Categoría:** Performance / Base de datos
**Roles:** Performance
- `AdminAnalyticsDashboard.tsx` hace 2 queries separadas por técnico (`getTechnicianAverageWorkTime`, `getTechnicianBreakStats`) en vez de una agregación `GROUP BY`. `tickets.technician_id` y `tickets.created_at` (usado para ordenar en cada `getTickets()`) no tienen índice dedicado.
- **Impacto:** con 20 técnicos, 40 queries secuenciales en vez de 2; el listado de tickets hace sort completo de tabla en cada carga — esto empeora linealmente con el volumen de datos.

### M3 — `AbortController` con timeout de 5s es un no-op en `repository.ts`
**Categoría:** Performance / React
**Roles:** Next.js/React
- En `getTechnicians`, `getTickets`, `getWorkOrders`, `getIncompleteReports`, se crea el `controller`/`setTimeout(abort, 5000)` pero **nunca se pasa `controller.signal`** a la llamada de Supabase — el timeout no hace nada.
- **Impacto:** si una request a Supabase se cuelga, el `await` bloquea indefinidamente pese a que el código sugiere visualmente lo contrario.

### M4 — Pad de firma no funcional; streams de cámara no se liberan al desmontar
**Categoría:** Formularios / Código muerto / React
**Roles:** Next.js/React
- `EvidenceCapture.tsx:291`: `<canvas onLoad={setupSignaturePad} .../>` — los elementos `<canvas>` no disparan evento `load`, por lo que la superficie de firma nunca tiene handlers (aunque es código huérfano vía C7). En `EvidenceCapture.tsx`/`WorkPhotoCapture.tsx`, `getUserMedia` solo se detiene con un botón "Cancelar" explícito — no hay cleanup en `useEffect` al desmontar.
- **Impacto:** si estos componentes se reconectan, navegar fuera de la página con la cámara activa deja el indicador de "cámara en uso" encendido y el stream corriendo, un leak de recursos y de privacidad.

### M5 — CRUD de técnicos es solo Create/Read; no hay Update ni Delete/desactivación pese a existir el campo `active`
**Categoría:** CRUD / Permisos
**Roles:** QA
- `repository.ts` solo expone `getTechnicians`/`createTechnician`. La página de listado (`technicians/page.tsx`) muestra un pill "Activo/Inactivo" pero no hay ningún control para cambiarlo, ni para editar datos de contacto.
- **Impacto:** una vez creado, un admin no tiene forma de desactivar un técnico que dejó la empresa, ni de corregir un error de carga — brecha operativa real en revocación de acceso.

### M6 — `completeWorkTimer` es código muerto que reintroduciría el bypass de cierre si se reconecta
**Categoría:** Código muerto / CRUD
**Roles:** QA
- `src/lib/timeTracking.ts:196-275` está importado en `WorkTimer.tsx` pero nunca invocado (comentario: "Modal de finalización removido"). Escribe directo `status: 'completed'` y filas de `work_orders` con forma incompatible con `WorkOrder` real.
- **Impacto:** sin tests, un cambio futuro que reconecte el botón "Finalizar" reintroduciría silenciosamente el cierre directo desde el timer que la regla de negocio prohíbe.

### M7 — Modales sin semántica de accesibilidad (sin `role="dialog"`, sin focus trap, sin cierre por Escape)
**Categoría:** Accesibilidad
**Roles:** UX
- `WorkTimer.tsx` (modal de motivo de pausa), `tickets/[id]/page.tsx` (modal "No completado"), `DocumentViewer.tsx` (previsualización de imagen) — los tres son `<div style={{position:'fixed', inset:0}}>` planos.
- **Impacto:** usuarios de teclado o lector de pantalla no pueden operar ni cerrar confiablemente estos diálogos; el foco puede escapar hacia el contenido detrás.

### M8 — Componentes SLA*/Document* duplicados con paletas y vocabularios de estado distintos
**Categoría:** Componentes repetidos / UI
**Roles:** Architect, UX
- `SLABadge`, `SLAAlertBadge`, `SLAIndicator`, `SLAVisualizer`, `SLAMetricsPanel`, `StatusPill` — seis implementaciones independientes de "mostrar estado SLA" con etiquetas distintas ("SLA en orden" vs "✓ En Tiempo" vs "Estable" vs "OK"). `DocumentViewer` (temática por variables CSS) vs `DocumentsViewer` (colores hardcodeados) hacen lo mismo con paletas distintas.
- **Impacto:** la app se percibe visualmente inconsistente entre pantallas que muestran conceptualmente la misma información.

### M9 — `Avatar.tsx` adivina el género de la persona a partir de su nombre
**Categoría:** Accesibilidad / UX
**Roles:** UX
- `src/components/Avatar.tsx:7-26` (`detectGender`) usa una lista hardcodeada de nombres en español más heurísticas de sufijo, sin opción de que el usuario lo corrija, con fallback a "male" para nombres no reconocidos/no latinos.
- **Impacto:** riesgo real de identificar erróneamente el género de técnicos/admins en una herramienta profesional, sin forma de corregirlo.

### M10 — Validación de formularios inconsistente fuera de `CreateTicketForm`
**Categoría:** Formularios / Validaciones
**Roles:** UX, QA
- El formulario de creación de técnicos pre-rellena `"tech123"` sin explicación ni regla de fortaleza; los formularios de edición de ticket usan solo `required` nativo sin manejo de errores si `editTicket`/`addTicket` fallan.
- **Impacto:** confianza desigual en la retroalimentación de formularios entre pantallas; nuevos técnicos reciben siempre la misma contraseña adivinable.

### M11 — `AppContext` no memoiza su `value`; recomputación completa de SLA en cada poll de 10s
**Categoría:** Performance / React
**Roles:** Performance
- El objeto `value` del contexto cambia de identidad en cada `refreshData()` (nuevos arrays/objetos siempre), forzando re-render de todos los consumidores. `AdminSLADashboard.tsx` llama `calculateSLACompliance`/`getCriticalTickets`/`groupTicketsBySLA` directo en el cuerpo del render, sin `useMemo` — cada una recorre el array completo de tickets.
- **Impacto:** cada consumidor de `useAppContext()` recalcula desde cero cada 10 segundos incluso cuando los datos no cambiaron.

### M12 — `WorkTimer` con doble intervalo: tick de 100ms más poll de 5s con dos queries secuenciales
**Categoría:** Performance / React
**Roles:** Performance
- El contador visual se actualiza 10 veces por segundo (`setInterval(100ms)`) para un valor que solo se muestra en `MM:SS` (resolución de 1s). El poll de 5s hace dos llamadas a Supabase secuenciales, no en paralelo.
- **Impacto:** 10x de re-renders innecesarios por cada ticket con timer activo; el costo de las dos queries se multiplica si hay varias instancias montadas.

### M13 — Sin rate limiting real; el existente es 100% cliente y trivialmente evadible
**Categoría:** Seguridad
**Roles:** Security
- `LoginRateLimiter` (5 intentos/10 min) se implementa contra `localStorage`/IndexedDB del propio navegador — se evade limpiando el storage o llamando directo al endpoint de Supabase. `forgot-password/page.tsx` no llama a ningún backend real (`// Simulamos envío de email`) — es un stub no funcional.
- **Impacto:** el brute-force no está realmente mitigado (y es discutible dado que la tabla de técnicos ya es de lectura pública por C1); tampoco existe una recuperación de contraseña real.

### M14 — Subida de archivos sin validación de tamaño/tipo en el cliente
**Categoría:** Seguridad / Formularios
**Roles:** Security
- `DocumentUploader.tsx` anuncia "máx. 10MB por archivo" pero nunca verifica `file.size` antes de leer el archivo con `FileReader`. El atributo `accept` es solo una sugerencia de UI, no se revalida.
- **Impacto:** riesgo de DoS/inflado de almacenamiento — los archivos terminan en base64 dentro de una columna JSONB sin límite real de tamaño.

### M15 — Sin separación entre scripts de producción y scripts de solo-desarrollo en `supabase/`
**Categoría:** Supabase / Base de datos / Arquitectura
**Roles:** Architect
- `cleanup_production.sql` (hace `TRUNCATE` de tablas completas) convive en la misma carpeta plana, sin convención de nombres, junto a `migration_fix_rls_work_timer.sql` (deshabilita RLS "para desarrollo").
- **Impacto:** un operador siguiendo la lista de archivos alfabética/cronológicamente no tiene ninguna señal para evitar aplicar un script de desarrollo contra producción, o viceversa.

### M16 — Falta de accesibilidad/consistencia en manejo de acceso denegado
**Categoría:** Navegación / Accesibilidad
**Roles:** UX
- Tres patrones distintos para denegar acceso: redirect silencioso (`RoleGuard`), `return null` + `router.replace` colocado **antes** de otros hooks del componente (violación del orden de hooks de React, riesgo de crash) en `tickets/new/page.tsx`/`tickets/[id]/edit/page.tsx`, y mensaje inline en `ordenes-trabajo/page.tsx`.
- **Impacto:** experiencia inconsistente al denegar acceso; riesgo latente de crash por violar las Rules of Hooks si `user` resuelve de forma asíncrona.

### M17 — Sin cobertura de tests automatizados en todo el proyecto
**Categoría:** Producción / Arquitectura
**Roles:** QA, Next.js/React
- No existe ningún archivo `*.test.*`/`*.spec.*`, ni test runner configurado en `package.json`.
- **Impacto:** ninguno de los hallazgos críticos de esta auditoría (motores de SLA divergentes, bypass de validación de transición, bug matemático de `sla.ts`) habría sido detectado por CI — son exactamente el tipo de lógica pura y fácilmente testeable que un puñado de tests unitarios habría atrapado de inmediato.

---

## 🟢 Bajos

### B1 — `next.config.ts` completamente por defecto
**Categoría:** Next.js / Performance
**Roles:** Next.js/React, Performance
- Sin configuración de `images`, `typedRoutes`, `reactCompiler`, `cacheComponents`/PPR pese a que la skill `cache-components` está instalada en el repo para esta versión exacta de Next.
- **Impacto:** oportunidades perdidas de reducir bundle y agregar seguridad de tipos en rutas; el login (primera pantalla de todo usuario) sirve tres imágenes hero externas sin `next/image`.

### B2 — Dependencias pesadas (leaflet, jspdf) sin `next/dynamic`, actualmente código muerto pero trampa a futuro
**Categoría:** Performance / Código muerto
**Roles:** Performance
- `MapViewer.tsx` y `reportGenerator.ts` importan estas librerías a nivel de módulo. Hoy no se usan en ninguna ruta real, así que no inflan el bundle — pero el primero que las conecte sin `dynamic(..., {ssr:false})` agregará decenas/cientos de KB gzip a esa ruta para todos los usuarios.
- **Impacto:** ninguno hoy; riesgo latente de regresión de performance.

### B3 — Hook de notificaciones realtime muerto con bug de forma de payload
**Categoría:** Código muerto / React
**Roles:** Next.js/React, Product Owner
- `useNotifications.ts` destructura `payload.oldRecord`/`payload.newRecord`, pero Supabase JS v2 expone `payload.old`/`payload.new`. No usado en ningún lado hoy.
- **Impacto:** landmine para quien intente conectar notificaciones en tiempo real más adelante esperando que funcione.

### B4 — `key={idx}` (índice) en lista dinámica reordenable
**Categoría:** React
**Roles:** Next.js/React
- `dashboard/page.tsx:130`: `criticalTickets.map((alert, idx) => ... key={idx})` pese a existir `alert.ticketId` como key estable disponible.
- **Impacto:** riesgo bajo hoy (filas sin estado propio), se vuelve un bug real si se agrega estado por fila (ej. expandir/colapsar).

### B5 — Zoom por pellizco deshabilitado en toda la app
**Categoría:** Accesibilidad / Responsive
**Roles:** UX
- `src/app/layout.tsx:24-28`: `viewport = { maximumScale: 1 }` — falla WCAG 1.4.4 (Resize Text).
- **Impacto:** usuarios con baja visión, o técnicos trabajando bajo luz solar directa, no pueden hacer zoom en la interfaz.

### B6 — Sin metadata SEO por página; sin robots/sitemap/manifest/OG image
**Categoría:** SEO
**Roles:** UX
- Solo existe un `metadata` export (en el layout raíz) en toda la app; no hay `robots.ts`, `sitemap.ts`, `manifest.ts`, ni imagen Open Graph. Todas las pestañas muestran el mismo título "Coordinatech", incluidas las páginas públicas de login/forgot-password.
- **Impacto:** pestañas/historial/marcadores indistinguibles; sin vista previa social si se comparte un link.

### B7 — Enlace muerto y estilos inconsistentes en páginas de autenticación
**Categoría:** UI / Navegación
**Roles:** UX
- `login/page.tsx:193`: `<a href="#">Contacte a Soporte</a>` no va a ningún lado. `forgot-password/page.tsx` usa colores hardcodeados (`#667eea`) y handlers `onMouseOver`/`onMouseOut` en línea en vez de las clases `.stitch-*` usadas en `/login`.
- **Impacto:** erosión menor de confianza/consistencia en las dos primeras pantallas que ve cualquier usuario.

### B8 — `globals.css` con definiciones de sistema de diseño duplicadas que se autosobrescriben
**Categoría:** UI / Código muerto
**Roles:** UX, Architect
- Un segundo bloque `:root` y reglas `.status-*` redefinen por completo el sistema de diseño original ("Stitch Material Design") más abajo en el mismo archivo — la mitad de la hoja de estilos es efectivamente código muerto (gana la última definición).
- **Impacto:** no visible hoy, pero ya causó deriva de color — varios componentes SLA hardcodean tonos de Tailwind que no coinciden con ninguno de los dos sistemas.

### B9 — Widget de SLA en detalle de ticket solo visible para admin
**Categoría:** UX / Permisos
**Roles:** QA, UX
- El helper `getSLA()` en `tickets/[id]/page.tsx` solo se renderiza `if user.role === "admin"`.
- **Impacto:** los técnicos, viendo su propio ticket asignado, no tienen ningún indicador de urgencia/SLA — contradice la regla de "contexto SLA personal" para el rol técnico.

### B10 — Versiones de dependencias muy recientes sin auditoría de vulnerabilidades realizada
**Categoría:** Seguridad
**Roles:** Security
- Next 16.2.6, React 19.2.4 son versiones mayores muy nuevas; `jspdf`, `leaflet`, `dexie` están fijadas a versiones específicas. No se verificó contra una base de datos de advisories en vivo.
- **Impacto:** recomendado correr `npm audit` antes de cualquier despliegue a producción.

---

## Aspectos positivos verificados

Para mantener la auditoría balanceada, estos puntos fueron verificados como correctamente implementados:

- **Separación de cierre vs. timer (en el flujo alcanzable):** `WorkTimer.tsx` no ofrece ningún botón de "completar" — el único camino de cierre visible en `tickets/[id]/page.tsx` es el enlace a "Completar Orden de Soporte", cumpliendo la regla documentada en el flujo realmente enrutado (aunque C6 muestra que ese flujo no exige evidencia real).
- **Selección de tipo de ticket:** los tres tipos (ST/INS/RT) son seleccionables en `CreateTicketForm.tsx` con el mapeo correcto de prefijo/color en `TICKET_TYPE_META` — la captura del dato es correcta, aunque no impacta el cálculo de SLA real (C3).
- **Sin vulnerabilidades de inyección clásicas:** no se encontró `dangerouslySetInnerHTML`, ni concatenación de SQL crudo (todo el acceso a datos usa el cliente parametrizado de Supabase), ni claves `service_role` expuestas en código de cliente.
- **Sin secretos `.env` commiteados:** los archivos `.env*` están correctamente ignorados por git.
- **API de tickets con máquina de estados bien diseñada (en el papel):** `isValidStateTransition` en `route.ts` está bien estructurada — el problema es que su llamador la bypasea (C5), no que la lógica en sí esté mal escrita.
- **Manejo de reportes jsPDF sin superficie de inyección:** usa las APIs de texto/tabla de jsPDF con strings planos, sin renderizado de HTML.

---

## Matriz de cobertura por categoría solicitada

| Categoría solicitada | Hallazgos relevantes |
|---|---|
| Arquitectura | C3, C11, A1, A2, A7, M15 |
| UX | C6, A13, A14, M7, M9, M10, M16, B5, B7, B9 |
| UI | M8, B7, B8 |
| Navegación | C11, A4, A8, M16, B7 |
| Dashboard | C3, C11, A10, A9 |
| CRUD | C5, C6, A2, M5, M6 |
| Formularios | C6, A3, A13, M4, M10, M14 |
| Validaciones | C5, A3, M10 |
| Permisos | C8, C10, A4, A5, M5, M16, B9 |
| Supabase | C1, C2, A1, A6, A11, M15 |
| Base de datos | C1, C2, C4, A1, A5, M2, M15 |
| Performance | M1, M2, M3, M11, M12, B1, B2 |
| Next.js | A7, A8, M3, B1, B3, B4 |
| React | A7, M3, M4, M11, M12, B4 |
| Accesibilidad | M7, M9, B5, B9 |
| Responsive | A13, B5 |
| Componentes repetidos | C7, A8, A9, M8 |
| Código muerto | C7, C11, A8, A9, M6, B2, B3, B8 |
| Tipado | C3, C4, C8 |
| Seguridad | C1, C2, C9, C10, A5, A6, M13, M14, B10 |
| SEO | B6 |
| Producción | C6, C7, C8, A10, A11, A12, M17 |

---

## Nota de proceso

Esta auditoría es de **solo lectura y análisis** — no se modificó, creó ni eliminó ningún archivo del proyecto. No se proponen soluciones ni implementaciones en este documento; el siguiente paso natural sería priorizar y planificar la remediación de los hallazgos 🔴 críticos (especialmente la consolidación del motor de SLA y el endurecimiento de RLS/autenticación) antes de cualquier despliegue a producción real.

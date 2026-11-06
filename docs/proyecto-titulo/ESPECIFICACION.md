# CoordinaTech — Especificación de referencia (Informe Final)

> Fuente: *Informe-proyecto-titulo_corregido* (Google Drive, versión del 2026-11-06),
> segunda entrega del Proyecto de Título "CoordinaTech: Software de Gestión y
> Trazabilidad de Servicios Técnicos". Este archivo resume lo que el informe
> **compromete** para que el desarrollo se mantenga alineado. Ante dudas, manda el informe.
> Las diferencias con el código actual están en [`BRECHAS.md`](./BRECHAS.md).

## 1. Contexto

- Caso real: **ZeroQ** (tótems de autoatención en notarías, salud, municipios, bancos).
- Problemas diagnosticados (línea base Unidad 1):
  - 24 % de visitas técnicas fallidas.
  - Hasta 30 días de latencia administrativa de cierre.
  - ~$4.000.000 CLP/mes en multas por incumplimiento de SLA.
- Alcance: **Panel Web** (supervisor y cliente, este repo) + **App Técnico** nativa
  Android (Kotlin + Jetpack Compose, repo aparte) que comparten backend, BD y reglas.

## 2. Stack comprometido

| Capa | Tecnología |
|---|---|
| Panel Web | Next.js (App Router) + TypeScript + Tailwind CSS |
| Lógica de negocio | Server Actions (Panel Web) + Route Handlers HTTPS (App Técnico) |
| Datos | Supabase: PostgreSQL + RLS multi-tenant, Auth (JWT), Storage, Realtime |
| Mapas / gráficos | Leaflet / Recharts |
| App Técnico | Kotlin 1.9, Jetpack Compose, Retrofit/OkHttp, Room (SQLite) offline |
| Push | Firebase Cloud Messaging |
| Hosting / CI | Vercel (Pro) + GitHub; despliegue automático desde la rama principal |
| Pruebas | Jest + Testing Library, Playwright (smoke), k6 (carga), Espresso (Android) |
| Metodología | Scrum, sprints de 2 semanas |

Costo de operación estimado: US$45/mes (Vercel Pro 20 + Supabase Pro 25) + US$25 Play Console.

## 3. Componentes de lógica de negocio

| Componente | Responsabilidad |
|---|---|
| Gestor de Tickets | Máquina de estados `nuevo → asignado → en_progreso → completado`, con bitácora de cada cambio. |
| Motor de SLA | Calcula la ventana al crear el ticket según tipología y evalúa la semaforización. |
| Gestor de Órdenes de Trabajo | Apertura, diagnóstico/solución y cierre validado de la OT. |
| Hashing SHA-256 | Huella de cada evidencia fotográfica sobre tablas append-only (FIPS 180-4). |
| Notificaciones | Avisos de asignación y recordatorio por vencimiento (FCM a la App Técnico). |
| Reportes y analítica | KPI y exportación de OT cerradas. |
| Sincronización local / API de sync | Cola offline en la App Técnico; Route Handlers que validan JWT y evitan duplicados. |

## 4. Procesos de negocio (BPMN)

1. **Gestión de Ticket:** supervisor registra (tipo, prioridad, dirección) → *Calcular SLA* → asigna técnico → notificación.
2. **Ejecución de Visita:** técnico recibe aviso → "Comenzar trabajo" (inicia cronómetro, estado *En progreso*; si no, reenvío de aviso) → llegada por GPS → diagnóstico → solución o bloqueo (repuesto/escalamiento).
3. **Cierre y Conformidad:** diagnóstico + solución → *Capturar evidencia* (+ hash SHA-256) → firma del cliente + calificación 1–5 → el sistema valida evidencia y firma → *Completado* (disponible para facturación).

Reglas «include»: evidencia ⇒ hash; finalizar trabajo ⇒ evidencia; crear ticket ⇒ cálculo de SLA.
Regla «extend»: reasignación extiende la consulta de detalle.

Actores: **Administrador**, **Supervisor**, **Técnico**, **Cliente** (sin cuenta; firma y califica en el dispositivo del técnico).

## 5. SLA

| Código | Tipología | Respuesta inicial | Resolución | Amarilla (70 %) | Disponibilidad |
|---|---|---|---|---|---|
| ST | Soporte Técnico Correctivo | < 30 min | **2 h** | 84 min | 99,5 % |
| INS | Instalación y Configuración | < 60 min | **5 h** | 210 min | 99,0 % |
| RT | Retiro y Desmantelamiento | < 60 min | **3 h** | 126 min | 99,0 % |

Semaforización (tiempo **consumido** de la ventana):

- **Verde:** < 70 %.
- **Amarilla:** 70 %–85 % → notifica al despachador en el Panel Web.
- **Roja:** > 85 % o vencido sin cierre validado → incumplimiento y posible penalización.

Otros compromisos:

- Horario de servicio: L–V 08:00–20:00, sáb 09:00–14:00 (Chile continental). Fuera de horario **los plazos se suspenden** y se reanudan en la siguiente jornada hábil.
- Mantenimiento: domingos 02:00–05:00, aviso 72 h.
- Desempeño: < 2 s en p95; dashboard < 250 ms; 50 técnicos concurrentes por organización.
- Continuidad: RTO 4 h, RPO 24 h; operación offline del técnico durante caídas.
- `sla_limite_horas` se **copia al ticket** al crearlo (no se recalcula si cambia `SLA_CONFIG`).

## 6. KPI

| KPI | Fórmula | Meta | Línea base |
|---|---|---|---|
| KPI-01 Cumplimiento SLA | OT cerradas en plazo / OT cerradas × 100 | ≥ 90 % | sin medición |
| KPI-02 MTTR administrativo | Σ(fecha_cierre_OT − fecha_fin_trabajo) / N | < 24 h | hasta 30 días |
| KPI-03 Visitas fallidas | visitas no concretadas / visitas × 100 | < 5 % | 24 % |
| KPI-04 CSAT | Σ puntajes / N calificaciones (1–5) | ≥ 4,0 | sin medición |

Cálculo mediante vistas indexadas en PostgreSQL, mostrado en el dashboard admin.

## 7. Modelo de datos (Anexo A)

11 entidades, UUID como PK, todas las fechas `TIMESTAMPTZ` (ISO 8601). `ORGANIZACION` es la raíz multi-tenant y RLS filtra por `organizacion_id`.

| Entidad | Campos clave |
|---|---|
| ORGANIZACION | nombre, rut (UQ), rubro, fecha_creacion |
| USUARIO | organizacion_id, nombre, correo (UQ), rol `admin/supervisor/tecnico`, telefono, estado `activo/inactivo` |
| CLIENTE | organizacion_id, nombre, rut, correo, telefono, direccion |
| SLA_CONFIG | organizacion_id, tipo_ticket `ST/INS/RT`, horas_limite NUMERIC(5,2), activo |
| TICKET | organizacion_id, cliente_id, creado_por_id, tecnico_id (null), sla_config_id, tipo, titulo, descripcion, direccion, prioridad `alta/media/baja`, estado `nuevo/asignado/en_progreso/completado`, sla_limite_horas, fecha_creacion/asignacion/inicio_trabajo/fin_trabajo |
| HISTORIAL_TICKET | ticket_id, usuario_id, estado_anterior, estado_nuevo, comentario, fecha_cambio |
| NOTIFICACION | usuario_id, ticket_id, tipo `asignacion/recordatorio`, mensaje, leida, fecha_envio |
| ORDEN_TRABAJO | ticket_id (UQ), tecnico_id, diagnostico, solucion_aplicada, materiales_utilizados, fecha_apertura, fecha_cierre |
| EVIDENCIA (append-only) | orden_trabajo_id, url_imagen, hash_sha256 CHAR(64), latitud/longitud NUMERIC(10,7), tipo `antes/durante/despues`, fecha_captura |
| FIRMA_DIGITAL | orden_trabajo_id (UQ), cliente_id, imagen_firma, nombre_firmante, rut_firmante, fecha_firma |
| CALIFICACION | orden_trabajo_id (UQ), cliente_id, puntaje SMALLINT 1–5, comentario, fecha_calificacion |

Cardinalidades: TICKET 1–0..1 ORDEN_TRABAJO; ORDEN_TRABAJO 1–0..1 FIRMA_DIGITAL y CALIFICACION.

## 8. Plan de pruebas — casos representativos (Tabla 24)

| ID | Caso | Tipo | Resultado esperado |
|---|---|---|---|
| CP-01 | Ticket ST | Unitaria | límite 2 h; amarilla a los 84 min; roja > 85 % |
| CP-02 | Ticket INS | Unitaria | límite 5 h; amarilla a los 210 min |
| CP-03 | Usuario de org A consulta tickets de org B | Integración (RLS) | 0 registros |
| CP-04 | Se altera 1 byte de una foto y se recalcula el hash | Unitaria | hash no coincide → evidencia no íntegra |
| CP-05 | Diagnóstico + foto sin señal, luego reconexión | Compat./integración | sincroniza completo, sin duplicados |
| CP-06 | Cerrar OT sin firma o sin evidencia | Humo/integración | cierre rechazado; no pasa a Completado |
| CP-07 | Asignar ticket con App Técnico en segundo plano | Integración | llega push FCM |

Criterios: cobertura ≥ 80 % en módulos críticos y 100 % de casos del motor de SLA; humo de 4 flujos (login, crear ticket, abrir OT, cerrar con evidencia) tras cada despliegue; cero fugas entre organizaciones.

Ambientes: Desarrollo (Supabase local + rama propia) → Preview Vercel + Supabase de pruebas → Piloto → Producción.

## 9. Normas

ISO/IEC 25010, ISO/IEC 27001, Ley 19.628, Ley 21.719, Ley 19.799 (firma electrónica simple), BPMN 2.0, UML 2.5, ISO 8601, OWASP Top 10, WCAG 2.1 AA, FIPS 180-4, Código de Ética del Colegio de Ingenieros, APA 7.

## 10. Gestión de configuración y cambios

- Git en GitHub con ramas protegidas y SemVer.
- Migraciones versionadas y **numeradas** junto al código.
- Variables de entorno por ambiente en Vercel/Supabase, nunca en el repo.
- Lockfile versionado.
- Cada cambio: rama propia → revisión por un segundo integrante → pruebas automáticas en verde → merge → deploy → smoke.
- Incidentes: severidad crítica/alta/media/baja; cada corrección agrega una prueba automatizada.

## 11. Cronograma (Tabla 29)

| Fase | Sprint | Semanas | Estado |
|---|---|---|---|
| Formulación | 0 | 1–5 | Completado |
| Diseño | 1 | 6–7 | Completado |
| Desarrollo (tickets + SLA) | 2 | 8–9 | Completado |
| Desarrollo (OT + evidencia + SHA-256) | 3 | 10–11 | Completado |
| Desarrollo (firma, calificación, offline) | 4 | 12 | Completado |
| Validación (feedback docente) | — | 13 | En ejecución |
| Cierre (dashboard, plan de pruebas, doc final — ES2) | 5 | 14 | En ejecución |
| Proyección: App Técnico iOS | — | posterior | Planificado |

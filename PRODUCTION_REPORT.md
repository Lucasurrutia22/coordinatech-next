# PRODUCTION_REPORT.md — Evaluación de CoordinaTech para venta/producción

**Fecha:** 2026-07-03
**Rol de análisis:** CTO evaluando el activo técnico antes de una adquisición o antes de exponerlo a operación real con datos de clientes.
**Base de evidencia:** este informe sintetiza tres auditorías previas realizadas sobre el mismo repositorio — `PROJECT_AUDIT.md` (arquitectura/seguridad/QA/performance/producto, 7 revisores), `UX_REVIEW.md` (recorrido real de usuario, incluida verificación en vivo de `https://coordinatech-next.vercel.app/login`), `REFACTOR_PLAN.md` (calidad de código) — más verificación adicional de documentación, control de versiones y configuración de despliegue hecha para este informe. No se modificó ningún archivo.

---

## Veredicto ejecutivo

**CoordinaTech no está listo para producción ni para una venta sin condiciones.** Es un prototipo funcional y visualmente convincente — la primera impresión de un comprador que solo navegue la interfaz sería positiva — pero por debajo, tres pilares no negociables de cualquier producto SaaS que maneje datos operativos reales están rotos o ausentes: **no hay autenticación real, no hay control de acceso a nivel de base de datos, y no hay ninguna prueba automatizada**. A esto se suma que la lógica de negocio central del producto — el cálculo de SLA, la razón de ser de la herramienta — está implementada de forma contradictoria hasta cinco veces, por lo que el propio sistema no siempre sabe si un ticket está a tiempo o vencido.

Un hallazgo adicional que un comprador debe conocer: el propio repositorio contiene un documento interno (`PRODUCTION_IMPROVEMENTS.md`) que declara como **"COMPLETADO ✅"** exactamente las cosas que esta auditoría confirma que **no lo están** — RLS, 2FA, encriptación, auditoría de logs, rol de supervisor, validación server-side. Esto no es solo una brecha técnica, es una señal de gobernanza: la documentación interna no es confiable como fuente de verdad sobre el estado real del producto.

**Puntaje global de preparación para producción: 24 / 100.**

---

## Calificación por dimensión (0–100)

| Dimensión | Puntaje | Resumen de la justificación |
|---|---:|---|
| **Autenticación** | **5** | No existe un sistema de autenticación real. El login compara contraseñas en texto plano en el cliente contra una tabla totalmente legible por cualquier visitante anónimo. El "2FA" es un código fijo embebido en el bundle público — nunca se envía nada, un usuario real queda bloqueado. "Olvidé mi contraseña" es una simulación de 1.5 segundos que no llama a ningún backend. |
| **Seguridad** | **5** | RLS de Supabase con `using (true)` en prácticamente todas las tablas, o directamente deshabilitada en una migración. La contraseña de administrador y el código de "2FA" están embebidos en el JavaScript público vía `NEXT_PUBLIC_*`. La API de tickets no verifica identidad ni rol (IDOR confirmado) y su chequeo CSRF falla abierto. Hay un endpoint de envío de correo sin autenticación (relay abierto potencial). |
| **Base de datos** | **20** | El modelo de datos es razonable en el papel, pero las migraciones son archivos planos sin orden ni versión, con SQL inválido confirmado (FK de UUID contra una PK de tipo TEXT, sintaxis `COMMENT` inline no válida en Postgres) y versiones contradictorias del mismo cambio (`_LIMPIO`, `_EJECUTADA`). No hay índices en las columnas más filtradas (`technician_id`, `created_at`). El propio `localStorage` del navegador compite como "fuente de verdad" con Supabase. |
| **Escalabilidad** | **20** | Cada carga de página trae la tabla completa (`select("*")`, sin `.limit()`), con polling global cada 10 segundos que arranca incluso antes de iniciar sesión. Sin índices en los filtros más comunes. Consultas N+1 en el dashboard de analítica. La arquitectura es 100% cliente (39 de 41 archivos con `"use client"`), sin aprovechar Server Components ni caché de Next.js — el costo crece linealmente (o peor) con cada ticket/técnico nuevo. |
| **Testing** | **2** | No existe ni un solo archivo de test en todo el repositorio, ni un test runner configurado en `package.json`. Ninguno de los bugs encontrados en esta ronda de auditorías (motor de SLA matemáticamente roto, bypass de validación de transición de estado) habría sobrevivido a un puñado de pruebas unitarias. |
| **Deployment** | **20** | La aplicación sí está desplegada y corriendo (Vercel, verificado en vivo). Pero no hay pipeline de CI/CD (`.github/workflows` no existe), `next.config.ts` está completamente por defecto, no hay separación entre scripts SQL de desarrollo y de producción (un `cleanup_production.sql` que trunca tablas convive con un script que deshabilita RLS "para desarrollo"), y el manejo de secretos vía variables `NEXT_PUBLIC_*` es activamente peligroso. No se detectó repositorio git en esta copia de trabajo. |
| **Arquitectura** | **35** | Las reglas de capas están bien pensadas en `CLAUDE.md` pero se erosionaron en la práctica: el motor de SLA existe 3 veces con reglas distintas, la capa de repositorio (pensada como única puerta a Supabase) es evitada por 5+ puntos del código, y hay ~15 archivos completos (2.500+ líneas) sin ningún uso real, incluida una segunda implementación completa del dashboard y del detalle de ticket que nadie enruta. |
| **Código** | **35** | TypeScript en modo estricto y Zod están presentes (positivo). Pero hay duplicación seria: `calculateSLACompliance` existe con 3 firmas distintas en 3 archivos, hay pares de componentes (documentos, captura de evidencia) que resuelven el mismo problema dos veces, y varios archivos/componentes superan las 400–600 líneas mezclando fetch, cálculo de negocio y render en un solo lugar. |
| **UX** | **35** | El recorrido real como usuario confirma que **el login no se puede completar de forma confiable** (2FA falso) y que **la recuperación de contraseña no funciona**, dos bloqueadores absolutos para cualquier usuario real que no sea el propio desarrollador. El SLA se ve distinto según la pantalla, erosionando la confianza en el dato central del producto. El cierre de tickets depende de una ventana externa que probablemente no abre en celular (el dispositivo de los técnicos de campo). |
| **UI** | **50** | El sistema de diseño compartido (`surface-card`, `status-chip`, tipografía editorial) es consistente y de buen nivel en las pantallas principales (Dashboard, Tickets, Calendario, creación de tickets). Pero hay 5–6 componentes de "badge SLA" con colores y vocabularios distintos, componentes de documentos que chocan entre sí, y páginas enteras (Calendario, algunos dashboards admin) que abandonan el sistema compartido por estilos en línea hechos a mano. |
| **Performance** | **30** | Un `setInterval` de 1 segundo por cada fila de ticket visible, tres bucles de polling redundantes (10s + 30s + 30s) trayendo las mismas tablas completas, sin memoización del contexto global (cada poll re-renderiza toda la app), sin `useMemo` en cálculos de agregación repetidos. Las dependencias pesadas (Leaflet, jsPDF) hoy no cuestan nada porque están muertas, pero no hay `next/dynamic` preparado para cuando se conecten. |
| **Documentación** | **25** | `CLAUDE.md` es claro y de buena calidad sobre las reglas de negocio — un punto real a favor. Pero no hay `README.md` en la raíz del proyecto, las migraciones no están documentadas de forma coherente, y el hallazgo más grave: `PRODUCTION_IMPROVEMENTS.md` declara terminadas funciones de seguridad y negocio (RLS, 2FA, encriptación, auditoría, rol de supervisor) que verificablemente no existen en el código — la documentación activamente desinforma sobre el estado real del producto. |

**Promedio simple de las 12 dimensiones: 23.5 → se redondea a 24/100.**

No se pondera un promedio "generoso" aquí a propósito: en un producto de este tipo, Autenticación, Seguridad y Testing actúan como **compuertas de veto** — un puntaje de 5/100 en cualquiera de ellas basta para que el conjunto no sea presentable a producción, sin importar qué tan bien califiquen UI o Arquitectura.

---

## Hallazgo que un comprador debe ver antes que cualquier otro: la documentación interna no es confiable

`PRODUCTION_IMPROVEMENTS.md` (fechado 15 de junio de 2026, "Estado: EN EJECUCIÓN") lista como **completado** lo siguiente, verificado independientemente por esta ronda de auditorías:

| Reclamo del documento interno | Estado real verificado |
|---|---|
| "2FA (TOTP) - Ya implementado ✅" | No es TOTP — es un código fijo leído de una variable de entorno pública, nunca enviado al usuario |
| "RLS (Row Level Security) en Supabase" | Políticas `using (true)` (acceso irrestricto) o RLS **deshabilitada por completo** en una migración |
| "Encriptación de tokens" | El módulo de encriptación existe en el código pero no se usa en ningún flujo real; las contraseñas se guardan y comparan en texto plano |
| "Supervisor: Reportes de equipo" | El tipo de rol `UserRole` solo admite `"admin" | "tech"` — el rol Supervisor no existe en ninguna parte del sistema |
| "Validación servidor-lado (API routes)" | La API de tickets no valida identidad ni rol del llamador; el único formulario con Zod está desconectado de la ruta real de creación de tickets |
| "Logs de operaciones críticas... Retención de logs (90 días)" | No existe ningún sistema de auditoría/logging en el código |
| "Notificaciones básicas" (implementadas) | El hook de notificaciones en tiempo real existe pero no se usa en ninguna página — y tiene un bug que lo rompería si se conectara |
| "Real-time SLA updates via Supabase subscription" | No hay suscripción realtime activa; el "tiempo real" es polling cada 10-30 segundos, y el cálculo de SLA en sí está roto matemáticamente en uno de sus tres motores |

**Implicación para la venta:** cualquier checklist o reporte de estado que el equipo actual entregue como parte de la due diligence debe re-verificarse contra el código, no aceptarse como válido. Esto no descalifica el proyecto por sí solo, pero cambia la forma de negociar: el riesgo técnico real es mayor al que la documentación del vendedor sugiere.

---

## Qué falta exactamente para llegar a producción

Organizado por bloqueo — cada "compuerta" debe resolverse antes de que la siguiente tenga sentido.

### Compuerta 1 — Autenticación y seguridad (bloqueante absoluto, no negociable)
- [ ] Reemplazar el login manual (comparación de contraseña en cliente) por **Supabase Auth real** con sesiones server-verificadas.
- [ ] Hashear todas las contraseñas existentes y forzar su cambio en la migración (hoy están en texto plano, incluida una contraseña por defecto `tech123` commiteada en el seed).
- [ ] Implementar 2FA real (envío efectivo de código por correo/SMS/TOTP) o eliminar el paso hasta tenerlo, y arreglar "Olvidé mi contraseña" para que dispare un flujo real.
- [ ] Sacar la contraseña de administrador y cualquier secreto de variables `NEXT_PUBLIC_*` — deben vivir solo en el servidor.
- [ ] Reescribir **todas** las políticas RLS de Supabase para verificar `auth.uid()` contra la identidad/rol real, y re-habilitar RLS en las tablas donde está deshabilitada.
- [ ] Agregar verificación de identidad/rol real en las rutas API (`/api/tickets/[id]`, `/api/send-email`), no solo un chequeo de `Origin` que falla abierto.
- [ ] Ejecutar un `npm audit` y una revisión de dependencias antes de cualquier despliegue con datos reales.

### Compuerta 2 — Integridad del dato central (SLA) y base de datos
- [ ] Consolidar los 3–5 motores de cálculo de SLA en uno solo, con la política real documentada (ST 2h / INS 5h / RT 3h por tipo de ticket), y repuntar todas las pantallas a esa única fuente.
- [ ] Corregir el bug matemático de `sla.ts` que hace que todo ticket activo se muestre como "crítico".
- [ ] Reordenar y sanear las migraciones de Supabase: eliminar versiones contradictorias (`_LIMPIO`, `_EJECUTADA`), corregir el SQL inválido, y adoptar un esquema de migraciones versionado y reproducible.
- [ ] Agregar índices a `tickets.technician_id` y `tickets.created_at` (y cualquier otra columna usada en filtros de dashboards) antes de operar con volumen real.
- [ ] Decidir una única fuente de verdad entre Supabase y el almacenamiento local del navegador — hoy compiten y pueden divergir sin que el usuario lo note.

### Compuerta 3 — Testing
- [ ] Configurar un test runner (Vitest/Jest) — hoy no existe ninguno.
- [ ] Cobertura mínima no negociable antes de producción: el motor de SLA unificado, la máquina de estados de transición de tickets, y el flujo de cierre de ticket (para evitar que un técnico cierre sin evidencia real).
- [ ] Al menos un smoke test end-to-end del camino dorado: login → ver ticket → iniciar trabajo → completar orden de soporte.

### Compuerta 4 — UX bloqueante para el usuario real
- [ ] Arreglar el login/2FA/recuperación de contraseña (ver Compuerta 1) — hoy bloquean el acceso de cualquier persona real ajena al desarrollo.
- [ ] Exigir evidencia real (foto, firma, campos obligatorios) en el cierre de orden de soporte — hoy todos los campos sustantivos son opcionales u hardcodeados.
- [ ] Resolver la dependencia del flujo de cierre en una ventana externa (Zoho) que probablemente no abre en navegadores móviles.
- [ ] Construir las pantallas ausentes que se esperarían en un producto de este tipo si van a comercializarlo: gestión de Empresas/Clientes, gestión de Usuarios/administradores, y una pantalla de Configuración real (hoy ninguna existe).

### Compuerta 5 — Escalabilidad y performance
- [ ] Eliminar el polling redundante (hoy hay 3 bucles superpuestos) y sustituirlo por Supabase Realtime o revalidación bajo demanda.
- [ ] Agregar paginación/límites a toda consulta de listado (`select("*")` sin límite hoy en las 4 entidades principales).
- [ ] Memoizar el contexto global y los cálculos de agregación que hoy se recalculan en cada re-render.
- [ ] Mover al menos las rutas de mayor tráfico a Server Components / fetch en servidor para aprovechar Next.js 16 en vez de operar 100% como SPA cliente.

### Compuerta 6 — Código y documentación
- [ ] Eliminar los ~15 archivos sin uso real (~2.500+ líneas) confirmados en `REFACTOR_PLAN.md`, tras decidir explícitamente qué hacer con las dos excepciones que contienen funcionalidad potencialmente rescatable (`enhanced-page.tsx`, `CreateTicketForm.tsx`).
- [ ] Consolidar los componentes duplicados (badges SLA, visores de documentos, captura de evidencia) en una sola implementación cada uno.
- [ ] Escribir un `README.md` real (instalación, variables de entorno requeridas, arquitectura, cómo correr y desplegar) — hoy no existe ninguno en la raíz.
- [ ] Corregir o retirar `PRODUCTION_IMPROVEMENTS.md` para que la documentación interna refleje el estado real del código, no un estado aspiracional.
- [ ] Configurar CI/CD (lint + typecheck + tests en cada PR) — hoy no existe ningún pipeline automatizado.

---

## Recomendación final para el comprador

**No es un "no" definitivo — es un "no, todavía no, y el costo de arreglarlo no es trivial."** La interfaz, el flujo de negocio pensado (tickets → timer → orden de trabajo → SLA) y la elección de stack (Next.js 16, Supabase, TypeScript estricto, Zod) son una base razonable y no requieren un reinicio desde cero. Pero las Compuertas 1 y 3 (autenticación/seguridad real y testing) no son parches incrementales — son, en la práctica, **reconstruir la capa de autenticación desde cero sobre Supabase Auth** y **crear una suite de pruebas donde hoy no existe ninguna**. Ninguna de las dos es cosmética ni negociable si el producto va a manejar datos operativos reales de una empresa (tickets, técnicos, evidencia de clientes).

Antes de cerrar cualquier adquisición o de exponer esto a tráfico real, un CTO debería exigir: (1) que las Compuertas 1–3 estén resueltas y verificadas de forma independiente (no aceptar el checklist interno del equipo actual como prueba, dado el hallazgo de esta sección), y (2) presupuestar el trabajo de las Compuertas 1–3 como una condición de precio, no como un "detalle pendiente" — es, conservadoramente, semanas de trabajo dedicado de un equipo, no días.

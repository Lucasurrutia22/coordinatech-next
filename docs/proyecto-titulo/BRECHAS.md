# Brechas: Informe Final vs. código actual

> Comparación entre lo que compromete el Informe Final ([`ESPECIFICACION.md`](./ESPECIFICACION.md))
> y lo que hay hoy en `coordinatech-next` (revisión del 2026-11-06, rama
> `claude/elegant-bardeen-4zv4bi`). Cada brecha tiene un ID para
> referenciarla en commits, issues y en el tablero Scrum.
>
> Prioridad: **P0** = riesgo de seguridad o contradice una afirmación explícita del
> informe que la comisión puede verificar. **P1** = funcionalidad comprometida que falta.
> **P2** = calidad, proceso o deuda técnica.

## Resumen

| ID | Prioridad | Brecha | Área |
|---|---|---|---|
| B-01 | P0 | Umbrales de semaforización distintos (código 50/75 % vs. informe 70/85 %) | SLA |
| B-02 | P0 | No hay Supabase Auth/JWT: login validado en el cliente, contraseñas en texto plano | Seguridad |
| B-03 | P0 | No hay multi-tenant: falta `organizacion_id` y las políticas RLS están abiertas a `anon` | Seguridad / datos |
| B-04 | P0 | No hay hash SHA-256 de evidencia ni tabla append-only | Evidencia |
| B-05 | P1 | Falta el rol Supervisor (solo existen `admin` y `tech`) | Roles |
| B-06 | P1 | Falta bitácora `HISTORIAL_TICKET` de transiciones de estado | Trazabilidad |
| B-07 | P1 | Modelo de datos distinto al Anexo A (falta CLIENTE, SLA_CONFIG, NOTIFICACION, FIRMA_DIGITAL, CALIFICACION como entidades) | Datos |
| B-08 | P1 | El cierre no exige firma + evidencia en el servidor (CP-06) | Proceso 3 |
| B-09 | P1 | Faltan KPI-02 (MTTR), KPI-03 (visitas fallidas) y KPI-04 (CSAT) como métricas, y vistas SQL | KPI |
| B-10 | P1 | No existen Route Handlers / API de sincronización para la App Técnico | API |
| B-11 | P1 | Los plazos no se suspenden fuera del horario de servicio | SLA |
| B-12 | P2 | El informe nombra Recharts, pero no está en las dependencias | Stack |
| B-13 | P2 | Faltaba Jest (ya está, solo SLA); faltan Playwright y k6 | Pruebas |
| B-14 | P2 | Faltaba pipeline de CI (ya está); lint tiene 24 errores previos | CI |
| B-15 | P2 | Migraciones sin numeración y con duplicados (`_EJECUTADA`, `_LIMPIO`) | Configuración |
| B-16 | P2 | Nombres de estados en inglés (`pending`…) vs. informe (`nuevo`…) | Datos |

## Detalle

### B-01 — Semaforización SLA (P0)
- **Informe (cap. IV.2, CP-01/CP-02):** amarilla al consumir el 70 % (ST: 84 min), roja sobre el 85 %.
- **Código:** `SLA_CONFIG` en `src/types/domain.ts` usa `warningPercent: 50` y
  `criticalPercent: 25` sobre el tiempo **restante**. Eso equivale a amarilla al 50 %
  consumido y crítica al 75 % consumido.
- **Acción:** decidir cuál es la regla oficial. Si manda el informe: `warningPercent: 30`,
  `criticalPercent: 15` y actualizar `src/lib/sla.test.ts`. Hay que revisar badges, KPIs
  y alertas (`useSLAAlerts`) en las vistas de admin y de técnico.

### B-02 — Autenticación (P0)
- **Informe:** Supabase Auth con JWT, sesiones y recuperación de contraseña.
- **Código:** `AppContext.login` compara el correo y la contraseña del técnico en el
  navegador (`technicians.password` en texto plano). Las credenciales de admin vienen de
  variables `NEXT_PUBLIC_ADMIN_*`, que quedan expuestas en el bundle del cliente.
  El 2FA es un código fijo de demo.
- **Acción:** migrar a Supabase Auth (`auth.users` + tabla de perfiles con rol),
  quitar la columna `password` y validar la sesión en middleware y Route Handlers.

### B-03 — Multi-tenant y RLS (P0)
- **Informe:** RLS filtra por `organizacion_id` del usuario autenticado (CP-03).
- **Código:** `migration_consolidated_fix.sql` crea políticas `to anon using (true)`.
- **Depende de:** B-02, porque sin `auth.uid()` no se puede escribir RLS real.

### B-04 — Integridad de la evidencia (P0)
- **Informe:** hash SHA-256 de cada foto, tabla append-only (sin UPDATE ni DELETE) (CP-04).
- **Código:** las fotos se guardan como data URL base64 dentro de JSON en `work_orders`,
  sin hash. El único SHA-256 del código está en `security.hashPassword`.
- **Acción:** crear un módulo `src/lib/evidence.ts` (hash y verificación), una tabla
  `evidencia` con un trigger que bloquee UPDATE y DELETE, y archivos en Supabase Storage.

### B-05 a B-11
Ver la tabla resumen. Orden sugerido: **B-02 → B-03 → B-05 → B-07/B-06 → B-04 → B-08 → B-09 → B-10 → B-11**.

## Puntos a definir con el equipo

1. ¿El informe se ajusta al código o el código al informe? Aplica a B-01 (umbrales) y B-16 (nombres de estado).
2. La App Técnico (Kotlin) ¿vive en otro repositorio? Este repo no la contiene.
3. ¿Hay un proyecto Supabase de pruebas separado del de producción? (Tabla 23)

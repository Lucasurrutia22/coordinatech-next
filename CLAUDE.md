# CoordinaTech - Claude Project Guide

## Project Snapshot

CoordinaTech is a field service operations platform built with:

- Next.js App Router + TypeScript
- Supabase (Postgres, Auth, Realtime, RLS)
- Role-based UX for admin, technician, and supervisor
- SLA-first ticket lifecycle with realtime visibility

Primary business modules:

- Tickets and assignment workflow
- Work timer with break tracking
- Work orders as closure evidence
- SLA dashboards (admin and technician views)
- Photo + optional GPS evidence for field work

## Proyecto de Título — fuente de verdad

- `docs/proyecto-titulo/ESPECIFICACION.md`: summary of the Informe Final (thesis report). Use it for SLA, KPI, the data model (Anexo A) and the test cases CP-01..CP-07.
- `docs/proyecto-titulo/BRECHAS.md`: gaps between the report and the code (B-01..B-16). Reference the gap ID in commits that close one.
- The report lists Admin, Supervisor and Technician roles, multi-tenant RLS by `organizacion_id`, Supabase Auth/JWT, and SHA-256 append-only evidence. Do not add features that contradict these.
- Checks: `npm run typecheck`, `npm test` (Jest, `src/**/*.test.ts`), `npm run build`. CI runs all of them in `.github/workflows/ci.yml`.

## Core Architecture Rules

1. Respect layering and boundaries.
- UI in `src/app` and `src/components`
- Shared business logic in `src/lib`
- Shared domain types in `src/types/domain.ts`
- Cross-page state in `src/context/AppContext.tsx`

2. Keep business logic out of page-level UI code.
- Page files orchestrate.
- Calculations, validation, and policy logic live in `src/lib/*`.

3. Supabase is the source of truth.
- Schema changes must be migration-first in `supabase/*.sql`.
- Do not rely on implicit schema assumptions in frontend code.
- Keep RLS-compatible query patterns.

4. Preserve App Router and RSC conventions.
- Server/client boundaries must be explicit.
- Avoid introducing unnecessary client components.

5. Favor typed contracts.
- Reuse and extend existing domain types before creating new ad-hoc types.
- Keep type changes synchronized with migrations and repository access code.

6. Security and data integrity are non-negotiable.
- Maintain role checks and protected route behavior.
- Keep input validation with current schema strategy.
- Do not weaken authentication, rate-limit, session, or audit behavior.

## Business Rules (Must Not Regress)

1. SLA policy by ticket type.
- ST (Soporte Tecnico): 2h max
- INS (Instalacion): 5h max
- RT (Retiro): 3h max

2. SLA status semantics.
- OK: healthy remaining time
- WARNING: approaching deadline
- CRITICAL: near breach
- OVERDUE: breached
- COMPLETED: closed within policy

3. Technician closure flow.
- Technicians do not close work directly from timer actions.
- Proper closure is tied to work order completion flow.

4. Work timer traceability.
- Start, pause, resume, complete must remain auditable.
- Break reasons and timing must stay persisted and reportable.

5. Field evidence requirements.
- Work order can include work photo evidence.
- GPS capture is optional but supported when permissions are granted.

6. Role visibility and access.
- Admin: global operational and SLA visibility.
- Technician: assigned work and personal SLA context.
- Supervisor: team/reporting scope.

## Implementation Guardrails

1. When touching SLA behavior:
- Update calculations in shared SLA libraries.
- Verify both admin and technician UI paths.
- Check badges, dashboard KPIs, and ticket list indicators.

2. When touching work timer or work orders:
- Preserve event sequence consistency.
- Keep database records compatible with existing migration model.

3. When touching Supabase:
- Prefer explicit migrations over silent runtime fixes.
- Re-check RLS implications for each schema/query change.

4. When adding new features:
- Reuse existing patterns before introducing new architectural primitives.
- Keep backwards compatibility with current domain data where feasible.

## Preferred Workflow

1. Clarify requirement and impacted modules.
2. Propose minimal, safe change set.
3. Implement with strict typing and boundary discipline.
4. Validate lint/build and critical user flows.
5. Document behavior changes when business rules are affected.

## Custom Agents Available

- `@architect` for architecture and technical design decisions
- `@qa-reviewer` for strict quality and regression reviews
- `@product-owner` for requirement shaping, scope, and acceptance criteria

Use them explicitly for complex requests that require deeper specialization.

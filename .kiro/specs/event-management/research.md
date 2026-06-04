# Research & Discovery Log — event-management

## Summary
- **Discovery type**: Light (Extensión sobre `platform-foundation`). No requiere investigación externa: el stack, los patrones de RLS, el contrato de identidad y la estructura de capas ya están establecidos y validados en la foundation.
- **Objetivo del discovery**: confirmar los puntos de integración y replicar exactamente los patrones existentes (RLS multi-tenant, guardas server-side, composables, navegación por rol) para las nuevas entidades `events` y `ticket_tiers`.

## Research Log

### Tema 1: Patrón RLS reutilizable de la foundation
- **Fuente**: `supabase/migrations/0002_rls_helpers.sql`, `0003_rls_policies.sql`.
- **Hallazgos**:
  - Helpers disponibles: `public.auth_company_id() → uuid`, `public.auth_role() → public.app_role`, `public.is_super_admin() → boolean`. Leen de `app_metadata` del JWT.
  - Patrón de política: `to authenticated`, envolviendo helpers en `(select ...)` para cachear vía InitPlan; SELECT/UPDATE/DELETE con `USING`, INSERT/UPDATE con `WITH CHECK`.
  - RLS `enable` + `force` en toda tabla con `company_id`; grants base a `authenticated` (RLS filtra por encima).
- **Implicación**: `events` y `ticket_tiers` reutilizan el mismo patrón. Además de aislar por empresa, se puede codificar el rol en las políticas de escritura (defensa en profundidad) usando `auth_role()`.

### Tema 2: Contrato de identidad y guardas server-side
- **Fuente**: `server/utils/auth.ts`, `app/utils/authz.ts`, `app/types/auth.ts`.
- **Hallazgos**:
  - `requireUser(event)` (401) y `requireRole(event, roles)` (403) centralizan la autorización; nunca confían en el cliente.
  - `AuthContext` expone `userId`, `email`, `companyId`, `role`, `status`. La lógica pura vive en `~/utils/authz` y está testeada con Vitest.
- **Implicación**: los server routes de eventos usan `requireRole`. La autorización por rol (COMPANY_ADMIN todo; EVENT_MANAGER sin eliminar; GATE_STAFF sin acceso) se expresa con `requireRole`.

### Tema 3: Patrones de cliente (composables, navegación, UI)
- **Fuente**: `app/composables/useAuth.ts`, `app/composables/useAuthorization.ts`, `app/app.config.ts`.
- **Hallazgos**:
  - Composables consumen `server/api` vía `$fetch`; los componentes no contienen lógica crítica.
  - Navegación declarativa filtrable por rol en `app.config.ts` (`NavItem { label, to, roles }`); las specs aguas abajo añaden entradas aquí.
  - `useAuthorization().can(roles)` y `visibleNav` ya disponibles para mostrar/ocultar acciones.
- **Implicación**: se añade una entrada de navegación "Eventos" (roles de gestión) en `app.config.ts` y composables `useEvents` / `useTicketTiers` que consumen los nuevos server routes.

## Architecture Pattern Evaluation
- **Patrón**: se mantiene la **arquitectura en capas con dirección de dependencias estricta** y la **defensa en profundidad** de la foundation (RLS en DB + `requireRole` en server routes + guardas de UI para UX). No se introduce un patrón nuevo: sería incoherente con la base.
- **Validación server-side**: se extrae la validación de entrada a un módulo puro y testeable (`server/utils/events-validation.ts`), siguiendo el mismo criterio que motivó extraer `authz.ts` (lógica pura, sin runtime de Nuxt/Supabase, cubierta por unit tests).

## Design Decisions
- **DD1 — Defensa en profundidad por rol en RLS**: además de aislar por `company_id`, las políticas de escritura de `events`/`ticket_tiers` restringen por rol (`auth_role()`): INSERT/UPDATE para `COMPANY_ADMIN`/`EVENT_MANAGER`; DELETE de eventos solo `COMPANY_ADMIN`. Motivo: que un bypass accidental del server no permita a GATE_STAFF escribir. La autorización primaria sigue siendo `requireRole` en el server route.
- **DD2 — Estado del evento como enum cerrado + máquina de transiciones server-side**: `event_status` enum (`draft`,`published`,`finished`,`cancelled`). Las transiciones válidas se validan en el server (no en la UI). Publicar exige ≥1 tier.
- **DD3 — Precio y moneda explícitos**: `price numeric(12,2)` (exacto, `>= 0`; `0` = gratis) y `currency char(3)` (ISO 4217, validado por formato server-side). Se evita `float` por exactitud monetaria.
- **DD4 — Cupo por tier**: `quota integer >= 0` por tier; sin aforo total de evento (decisión de producto confirmada). `0` se interpreta como sin emisión disponible hasta configurarlo.
- **DD5 — Eliminación de evento en cascada**: borrar un evento elimina sus `ticket_tiers` (FK `on delete cascade`). Solo `COMPANY_ADMIN`.

## Risks & Mitigations
- **R1**: GATE_STAFF necesitará leer eventos/tiers en `ticketing-checkin`. *Mitigación*: la política SELECT permite a cualquier usuario autenticado de la empresa leer (aislamiento por empresa). La restricción de gestión (GATE_STAFF sin acceso) se aplica a nivel de feature en los server routes de gestión, no en SELECT de RLS.
- **R2**: Divergencia entre transiciones de estado en UI vs server. *Mitigación*: la máquina de estados vive solo en el server; la UI solo habilita/oculta acciones.
- **R3**: Acoplamiento del downstream al esquema de tiers. *Mitigación*: documentar `events`/`ticket_tiers` como contrato consumido por `ticketing-checkin` en Revalidation Triggers.

## Synthesis Outcomes
- **Generalización adoptada**: reutilizar el patrón RLS y los helpers de la foundation sin redefinirlos (no se crean nuevos helpers de claims).
- **Build-vs-adopt**: validación de entrada propia (módulo puro) en lugar de añadir una dependencia de validación, para mantener el footprint mínimo y la testabilidad ya demostrada con `authz.ts`.
- **Simplificación**: sin aforo total de evento ni multi-moneda a nivel de catálogo global; la moneda es por tier (permite, p. ej., tiers en distinta moneda si el negocio lo requiere, sin lógica de conversión).

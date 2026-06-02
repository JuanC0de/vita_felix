# Brief: event-management

## Problem
Cada empresa necesita crear y administrar sus eventos musicales y configurar las etapas de boletería (ticket tiers) de cada evento (p. ej. preventa, general, VIP) con sus cupos y precios. Sin esta capa, no hay catálogo sobre el cual registrar asistentes ni emitir tickets.

## Current State
Tras `platform-foundation`: existe la app Nuxt 4 con Supabase, aislamiento multi-tenant (RLS), RBAC y el shell del dashboard. Aún no hay entidades de eventos ni de boletería.

## Desired Outcome
- Tablas `events` y `ticket_tiers` con RLS por `company_id`, heredando el patrón de aislamiento.
- Servicios server-side y composables para CRUD de eventos y de etapas de boletería.
- Pantallas: listado de eventos, crear evento y configurar boletería (gestión de tiers de un evento).
- Autorización por rol: COMPANY_ADMIN y EVENT_MANAGER gestionan eventos de su empresa; SUPER_ADMIN transversal; GATE_STAFF sin acceso de gestión.

## Approach
Modelar `events` (pertenece a una empresa) y `ticket_tiers` (pertenece a un evento) con claves foráneas y RLS. La lógica de acceso a datos vive en servicios/server routes; los componentes Vue consumen vía composables. UI con Tailwind siguiendo el shell del dashboard existente.

## Scope
- **In**: Esquema y RLS de `events` y `ticket_tiers`; servicios + composables de CRUD; pantallas de listado de eventos, crear evento y configurar boletería; validaciones de entrada; autorización por rol.
- **Out**: Registro público de asistentes, tickets, QR, PDF y check-in (ticketing-checkin); setup base, auth y RBAC (platform-foundation).

## Boundary Candidates
- Esquema + RLS de `events`.
- Esquema + RLS de `ticket_tiers`.
- Servicios y composables de eventos.
- Servicios y composables de boletería.
- Pantallas de gestión (listado, crear, configurar boletería).

## Out of Boundary
- Cualquier flujo orientado al público o al staff de puerta.
- Generación de tickets, QR o PDF.
- Lógica de check-in.

## Upstream / Downstream
- **Upstream**: `platform-foundation` (multi-tenancy, RLS, RBAC, sesión, tipos base).
- **Downstream**: `ticketing-checkin` consume eventos y `ticket_tiers` para el registro público y la emisión de tickets.

## Existing Spec Touchpoints
- **Extends**: ninguno (nuevo dominio sobre la foundation).
- **Adjacent**: `platform-foundation` (reutiliza patrón RLS y helpers de RBAC; no debe redefinirlos).

## Constraints
- RLS por `company_id` en todas las tablas nuevas.
- Lógica de negocio en servicios/server routes; componentes Vue solo vía composables.
- Autorización server-side por rol.
- Stack fijo (Nuxt 4 / Supabase / Tailwind / TS).

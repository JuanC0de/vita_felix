# Brief: platform-foundation

## Problem
El SaaS atiende a múltiples empresas (tenants) que no deben ver ni tocar los datos de otras. Antes de construir cualquier funcionalidad de negocio se necesita una base segura: estructura del proyecto, autenticación, aislamiento multi-tenant y control de acceso por roles. Sin esto, toda funcionalidad posterior arrastraría riesgos de fuga de datos entre empresas y de escalamiento de privilegios.

## Current State
Proyecto greenfield. Solo existe la instalación de cc-sdd (`.cursor/skills/`, `.kiro/`, `AGENTS.md`). No hay aplicación Nuxt, ni esquema de base de datos, ni configuración de Supabase.

## Desired Outcome
- Aplicación Nuxt 4 + Vue 3 + TypeScript + Tailwind inicializada con estructura modular y escalable.
- Supabase conectado (Auth, PostgreSQL, Storage) con cliente server-side y cliente público correctamente separados.
- Esquema base multi-tenant: `companies`, `users`/perfiles y vínculo usuario↔empresa↔rol.
- Políticas RLS que garantizan aislamiento estricto por `company_id`.
- RBAC con 4 roles: SUPER_ADMIN, COMPANY_ADMIN, EVENT_MANAGER, GATE_STAFF, con resolución de rol server-side.
- Pantallas mínimas: Login y shell del Dashboard (layout autenticado con navegación según rol).
- Tipos TypeScript base del dominio (roles, company, sesión) reutilizables aguas abajo.

## Approach
Inicializar Nuxt 4 con módulo de Supabase. Definir el esquema SQL multi-tenant con RLS habilitado en todas las tablas y políticas basadas en `company_id` y rol. Autenticación vía Supabase Auth; el rol y la empresa del usuario se resuelven server-side (middleware de servidor) y nunca se confía en el cliente para autorización. Layout del dashboard con guardas de ruta por rol.

## Scope
- **In**: Setup del proyecto Nuxt 4; configuración de Supabase (Auth/DB/Storage); esquema SQL de `companies`, perfiles de usuario y roles; RLS multi-tenant; middleware de autenticación/autorización server-side; helpers de RBAC; pantalla de Login; shell del Dashboard; tipos TS base.
- **Out**: CRUD de eventos y boletería (event-management); registro público, tickets, QR, PDF, check-in (ticketing-checkin); cualquier UI de negocio más allá del login y el shell.

## Boundary Candidates
- Configuración e inicialización del proyecto Nuxt + Tailwind.
- Capa de acceso a Supabase (clientes server/cliente, variables de entorno, tipos de DB).
- Esquema multi-tenant + políticas RLS.
- Autenticación (Supabase Auth) y resolución de sesión.
- RBAC: definición de roles y guardas de autorización server-side.
- UI base: Login + shell del Dashboard.

## Out of Boundary
- Lógica de eventos, boletería, tickets o check-in.
- Generación de QR/PDF.
- Reportería, pagos, notificaciones.

## Upstream / Downstream
- **Upstream**: Supabase (servicio externo). Ninguna dependencia de spec previo.
- **Downstream**: `event-management` y `ticketing-checkin` dependen del esquema multi-tenant, RLS, RBAC, sesión y tipos base definidos aquí.

## Existing Spec Touchpoints
- **Extends**: ninguno (primer spec).
- **Adjacent**: ninguno.

## Constraints
- Stack fijo: Nuxt 4, Vue 3, TypeScript, Tailwind, Supabase (Auth/PostgreSQL/Storage).
- RLS habilitado en todas las tablas; aislamiento por `company_id`.
- Autorización resuelta server-side; el cliente nunca decide permisos.
- Estructura modular y preparada para escalar; lógica crítica fuera de componentes Vue.

# Research & Design Decisions

## Summary
- **Feature**: `platform-foundation`
- **Discovery Scope**: New Feature (greenfield)
- **Key Findings**:
  - `@nuxtjs/supabase` v2.x soporta Nuxt 4 y provee sesiones server-side vía `@supabase/ssr` con `useSsrCookies: true` (por defecto). En server routes se debe usar `serverSupabaseUser(event)` para validar la identidad; `serverSupabaseSession` se considera inseguro porque la sesión proviene del cliente.
  - El patrón multi-tenant probado en Supabase es: columna `company_id` en cada tabla aislada + **Custom Access Token Hook** que inyecta `company_id` y `role` en el `app_metadata` del JWT + políticas RLS que comparan la columna contra `auth.jwt()`. Nunca usar `user_metadata` para autorización (el usuario puede modificarlo); `app_metadata` solo se fija del lado servidor.
  - Rendimiento RLS: envolver las llamadas a funciones de auth en `(select ...)` para que Postgres las evalúe una vez por consulta (InitPlan) en lugar de por fila, e indexar `company_id` como columna líder.

## Research Log

### Módulo de autenticación para Nuxt 4 + Supabase
- **Context**: Determinar el mecanismo de auth server-side acorde a la restricción "validación crítica en server/api".
- **Sources Consulted**: nuxt-modules/supabase (GitHub), @nuxtjs/supabase (nuxt.com/modules), supabase.nuxtjs.org (docs / llms-full).
- **Findings**:
  - Última versión `@nuxtjs/supabase` 2.0.x con soporte Nuxt 3 y 4.
  - `useSsrCookies: true` comparte la sesión entre servidor y cliente usando `@supabase/ssr` (flujo PKCE; requiere páginas de login y confirm).
  - `serverSupabaseUser(event)` valida la sesión server-side; `serverSupabaseClient(event)` aplica RLS con la identidad del usuario; `serverSupabaseServiceRole(event)` omite RLS (solo backend, nunca cliente).
- **Implications**: La autorización se resuelve server-side con `serverSupabaseUser`. El service role queda reservado a tareas administrativas de plataforma (SUPER_ADMIN) y nunca se expone al cliente.

### Aislamiento multi-tenant y RBAC en Supabase
- **Context**: Garantizar aislamiento por empresa (R1) y RBAC server-side (R3) con bajo costo por consulta.
- **Sources Consulted**: SecureStartKit (Multi-Tenancy + RBAC 2026), Wonsuk Choi (Supabase Multi-Tenancy in Production), MakerKit (RLS Best Practices), AntStack (RLS performance).
- **Findings**:
  - Inyectar `company_id` y `role` en `app_metadata` vía Custom Access Token Hook (función Postgres que Supabase invoca antes de emitir el JWT).
  - RLS: habilitar y forzar RLS en cada tabla; políticas separadas por SELECT/INSERT/UPDATE/DELETE; usar `WITH CHECK` en escritura para impedir cross-tenant writes.
  - Para chequeos sensibles, validar contra una tabla de la base de datos (no solo el claim) mediante funciones `security definer` en un esquema no expuesto.
- **Implications**: El claim cubre el camino rápido (sin round-trip por consulta). Las funciones helper `auth_company_id()` y `auth_role()` (envueltas en `select`) alimentan las políticas. SUPER_ADMIN obtiene acceso transversal vía cláusula de rol en las políticas y/o service role en server routes administrativos.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| RLS en DB + claims en JWT (elegido) | `company_id`/`role` en `app_metadata`; RLS filtra por columna | Aislamiento a nivel base de datos, sin round-trips, defensa en profundidad | Claims "horneados" al emitir el token; cambios de empresa/rol requieren refrescar sesión | Patrón estándar Supabase multi-tenant 2026 |
| `SET LOCAL app.current_tenant` por request | Variable de sesión Postgres fijada tras verificar JWT | Soporta cambio de tenant intra-sesión | Más plomería server-side; cada request debe fijar contexto | Innecesario: un usuario pertenece a una sola empresa en este alcance |
| Aislamiento solo en capa de aplicación | Filtrar por `company_id` en queries server | Simple | Frágil: un bug filtra datos entre empresas | Rechazado: viola "aislamiento no depende del cliente/lógica" (1.3) |

## Design Decisions

### Decision: Aislamiento multi-tenant mediante RLS + claims en JWT
- **Context**: R1 exige aislamiento estricto por empresa que no dependa de la lógica del cliente.
- **Alternatives Considered**:
  1. RLS + claims en `app_metadata` (camino rápido, defensa en profundidad).
  2. `SET LOCAL` de variable de sesión por request (soporta multi-tenant intra-sesión).
  3. Filtrado solo en aplicación (rechazado por frágil).
- **Selected Approach**: RLS habilitado y forzado en todas las tablas con `company_id`; Custom Access Token Hook inyecta `company_id` y `role`; helpers `auth_company_id()`/`auth_role()` envueltos en `select`.
- **Rationale**: Aislamiento a nivel de base de datos (se cumple aunque haya bugs en la app), sin round-trips por consulta, alineado con el patrón Supabase recomendado.
- **Trade-offs**: Los claims se fijan al emitir el JWT; un cambio de rol/empresa requiere refrescar el token (aceptable: un usuario pertenece a una empresa).
- **Follow-up**: Verificar que SUPER_ADMIN (sin `company_id`) obtiene acceso transversal; cubrir políticas con pruebas.

### Decision: Autorización server-side con `serverSupabaseUser` + service role acotado
- **Context**: R3.2 y R7.2 exigen decisiones de autorización server-side; manipular el cliente no debe otorgar acceso.
- **Selected Approach**: Todas las operaciones protegidas resuelven identidad/empresa/rol con `serverSupabaseUser` y un helper server-side `requireUser`/`requireRole`. El service role solo se usa en server routes administrativos de plataforma, nunca en el cliente.
- **Rationale**: La identidad proviene de una sesión validada server-side; el cliente solo decora la UI.
- **Trade-offs**: Lógica de guardas duplicada (UI para UX + server para seguridad), pero es la postura segura.
- **Follow-up**: Centralizar guardas en `server/utils/auth` para evitar divergencias.

## Risks & Mitigations
- Riesgo: una tabla nueva olvida habilitar RLS → fuga cross-tenant. Mitigación: convención obligatoria + checklist y pruebas de políticas; documentado como Revalidation Trigger.
- Riesgo: claims desactualizados tras cambio de rol/empresa. Mitigación: forzar refresh de sesión / re-login al modificar membresía.
- Riesgo: uso accidental del service role en el cliente. Mitigación: clave solo en entorno server; helper único que la encapsula en `server/utils`.

## References
- [@nuxtjs/supabase](https://supabase.nuxtjs.org/) — módulo oficial, utilidades server-side.
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — inyección de claims.
- [Supabase RLS / Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — patrón de políticas.
- [MakerKit RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) — checklist de seguridad RLS.

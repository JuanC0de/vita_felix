# Brief: ticketing-checkin

## Problem
El público debe poder registrarse a un evento mediante un formulario público y recibir un ticket en PDF con un QR único que no pueda falsificarse ni reutilizarse. El staff de puerta debe escanear ese QR, y el sistema debe validar server-side y marcar el ticket como usado de forma atómica para impedir el doble ingreso. El QR no puede exponer la cédula del asistente.

## Current State
Tras `platform-foundation` y `event-management`: existe multi-tenancy con RLS/RBAC, y el catálogo de `events` + `ticket_tiers`. Falta todo el ciclo de vida del ticket: registro de asistentes, emisión, distribución y validación en puerta.

## Desired Outcome
- Tabla `attendees` (datos del registrante, cédula almacenada de forma segura, NO en el QR) y tabla `tickets` (vínculo asistente↔tier↔evento, estado, marca de uso) con RLS.
- Tabla / registro de `checkins` para auditoría del escaneo.
- Formulario público de registro (sin autenticación) que crea attendee + ticket.
- Generación de QR mediante **JWT firmado server-side con expiración**, cuyo payload referencia el ticket por id opaco (sin cédula); revocable por el estado del ticket en DB.
- Generación de ticket en **PDF** con el QR, almacenado en **Supabase Storage**; pantalla de ticket generado.
- **Escáner QR** (pantalla para GATE_STAFF) que envía el token al server.
- **Validación server-side** del JWT (firma + expiración) y verificación de estado en DB.
- **Check-in atómico** (operación única, p. ej. transacción / update condicional / RPC) que marca el ticket como usado solo si no lo estaba, evitando doble uso bajo concurrencia.

## Approach
Definir un módulo server-side único para el contrato del token QR (firma/verificación JWT, claims, expiración, secret) reutilizado tanto por la emisión como por la validación. El registro público y la emisión de ticket viven en `server/api`. La generación de PDF se hace server-side y se sube a Storage. El check-in se implementa como operación atómica en Postgres (transacción o función RPC con update condicional sobre el estado) para garantizar exactamente-un-uso. La validación nunca confía en datos del cliente: re-verifica firma, expiración y estado en DB.

## Scope
- **In**: Esquema y RLS de `attendees`, `tickets`, `checkins`; formulario público de registro; emisión de ticket; módulo de token QR (JWT firmado, payload sin cédula, expiración, revocación por estado); generación de PDF + Supabase Storage; pantalla de ticket generado; pantalla de escáner QR; endpoint de validación server-side; check-in atómico anti-doble-uso.
- **Out**: Setup base, auth, RBAC (platform-foundation); CRUD de eventos y tiers (event-management); pagos, notificaciones, reventa.

## Boundary Candidates
- Esquema + RLS de `attendees`, `tickets`, `checkins`.
- Módulo server-side del token QR (firma/verificación JWT).
- Endpoint y composable del formulario público de registro.
- Generación de PDF + carga a Storage.
- Pantalla de escáner QR (GATE_STAFF).
- Endpoint de validación + lógica de check-in atómico.

## Out of Boundary
- Gestión de catálogo de eventos/boletería.
- Infraestructura multi-tenant y autenticación base.
- Cobro, facturación o transferencia de tickets.

## Upstream / Downstream
- **Upstream**: `platform-foundation` (RLS, RBAC, sesión, roles — GATE_STAFF) y `event-management` (`events`, `ticket_tiers`).
- **Downstream**: ninguno previsto en el alcance actual (reportería/analítica quedan fuera).

## Existing Spec Touchpoints
- **Extends**: ninguno (nuevo dominio).
- **Adjacent**: `event-management` (referencia `ticket_tiers`/`events`, no los redefine); `platform-foundation` (reutiliza RLS/RBAC y el rol GATE_STAFF).

## Constraints
- El QR NO contiene la cédula; el payload referencia el ticket por id opaco.
- Anti-falsificación vía JWT firmado server-side con expiración, revocable por estado del ticket en DB.
- Validación 100% server-side; el cliente no decide validez.
- Check-in **atómico**: exactamente un uso por ticket bajo concurrencia (transacción o RPC con update condicional).
- Generación de QR, PDF y validación de check-in en `server/api`, nunca en componentes Vue.
- El formulario de registro es público (sin sesión) pero con validaciones de seguridad (rate limiting básico, validación de input, no exposición de datos sensibles).
- Stack fijo (Nuxt 4 / Supabase Auth/DB/Storage / Tailwind / TS).

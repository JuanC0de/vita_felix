# Implementation Plan — ticketing-checkin

> Convenciones: `[P]` = paralelizable. Cada subtarea referencia los requisitos que satisface.

- [x] 1. Tipos y configuración base
- [x] 1.1 [P] Crear `app/types/ticketing.ts` (TicketStatus, Attendee, Ticket, Checkin, PublicEvent, RegistrationInput/Result, CheckinResult) — _Req 7.3_
- [x] 1.2 Instalar dependencias `qrcode`, `pdf-lib`, `@types/qrcode`; añadir `runtimeConfig` server-only y `.env.example` (`QR_JWT_SECRET`, `ATTENDEE_ENC_KEY`, `QR_GRACE_HOURS`) — _Req 3,2,8_
- [x] 1.3 Extender `app/types/database.types.ts` con `attendees`, `tickets`, `checkins`, enum `ticket_status` — _Req 7.3_

- [x] 2. Migraciones de base de datos
- [x] 2.1 [P] `supabase/migrations/0009_ticketing.sql`: enum `ticket_status`, tablas `attendees`/`tickets`/`checkins`, índices, `UNIQUE(event_id, cedula_hash)` — _Req 1.4,2.1,6,7.3_
- [x] 2.2 `supabase/migrations/0010_ticketing_rls.sql`: RLS (SELECT empresa/super; UPDATE tickets y INSERT checkins por GATE_STAFF/COMPANY_ADMIN; sin INSERT authenticated para attendees/tickets) + función atómica `checkin_ticket` — _Req 2.3,2.4,2.5,5.4,6,8.3_
- [x] 2.3 `supabase/migrations/0011_storage_tickets.sql`: bucket privado `tickets` + policies de Storage — _Req 4.2_

- [x] 3. Módulos server puros (cripto/validación)
- [x] 3.1 [P] `server/utils/qr-token.ts`: `signToken`/`verifyToken` (HMAC HS256) — _Req 3.1,3.2,3.3,3.4,3.5_
- [x] 3.2 [P] `server/utils/attendee-crypto.ts`: `encryptCedula`/`decryptCedula`/`hashCedula` (AES-256-GCM + HMAC) — _Req 2.1,2.2,1.4_
- [x] 3.3 [P] `server/utils/ticketing-validation.ts`: `validateRegistrationInput` — _Req 1.2_
- [x] 3.4 [P] `server/utils/rate-limit.ts`: limitador básico en memoria por IP — _Req 1.6_

- [x] 4. Generación de PDF/QR y acceso a datos
- [x] 4.1 `server/utils/ticket-pdf.ts`: QR PNG (`qrcode`) + PDF (`pdf-lib`), sin cédula — _Req 4.1,4.4,4.5_
- [x] 4.2 `server/utils/tickets-repo.ts`: registro público (service role, dedup, estado evento), subida a Storage + URL firmada, lectura de ticket, check-in atómico (RPC, user client), auditoría — _Req 1,4.2,5,6_

- [x] 5. Endpoints
- [x] 5.1 `server/api/public/events/[eventId].get.ts`: datos públicos del evento + tiers (solo `published`) — _Req 1.3_
- [x] 5.2 `server/api/public/register.post.ts`: rate limit + validación + emisión (attendee+ticket+PDF) — _Req 1.1,1.2,1.4,1.5,1.6,2,3,4_
- [x] 5.3 `server/api/tickets/[id]/pdf.get.ts`: entrega del PDF (URL firmada) — _Req 4.2_
- [x] 5.4 `server/api/checkin/validate.post.ts`: requireRole GATE_STAFF, verificar token, check-in atómico, clasificar resultado, auditoría — _Req 5,6,7,8_

- [x] 6. Cliente (composables + páginas)
- [x] 6.1 [P] `app/composables/useRegistration.ts` y `app/composables/useCheckin.ts` — _Req 1,5_
- [x] 6.2 Página pública `app/pages/e/[eventId]/register.vue` + `components/ticketing/RegistrationForm.vue` (layout público) — _Req 1.1,1.2_
- [x] 6.3 Página `app/pages/t/[ticketId].vue` (confirmación + descarga del PDF) — _Req 4.3_
- [x] 6.4 Página `app/pages/scan.vue` + `components/ticketing/ScannerView.vue` + `CheckinResult.vue` (GATE_STAFF) — _Req 5.1,5.2,7.1,7.2_
- [x] 6.5 `app/app.config.ts`: nav "Escanear" para GATE_STAFF/SUPER_ADMIN — _Req 5.1_

- [x] 7. Tests y validación
- [x] 7.1 [P] Unit (Vitest): `qr-token`, `attendee-crypto`, `ticketing-validation` (19 tests) — _Req 1.2,1.4,2.1,3_
- [x] 7.2 RLS + atomicidad (Postgres harness): aislamiento, check-in exactamente-un-uso, void/cancelado, dedup (T0–T7) — _Req 2,6_
- [x] 7.3 E2E (Playwright): registro público (no disponible), ticket, escáner solo GATE_STAFF + flujo completo gated — _Req 1.1,4.3,5.1,5.2_
- [x] 7.4 `typecheck` + `vitest` (59) + `build` verdes; harness verde. Pendiente del usuario: aplicar 0009–0011 y configurar secretos/bucket en el Supabase remoto — _Req all_

## Implementation Notes
- Registro público = service role (anon no pasa RLS); check-in = user client (RLS por empresa).
- Atomicidad: el check-in se encapsuló en la función `public.checkin_ticket(uuid)` (SECURITY INVOKER, RLS del usuario). El `UPDATE ... WHERE status='valid' AND evento no cancelado` es atómico por bloqueo de fila → exactamente-un-uso; clasifica already_used / void / event_cancelled / not_found y registra auditoría en `checkins`.
- Cédula: `cedula_enc` (AES-256-GCM) + `cedula_hash` (HMAC) → confidencialidad + dedup `UNIQUE(event_id, cedula_hash)`.
- Secretos server-only vía `runtimeConfig` (`NUXT_QR_JWT_SECRET`, `NUXT_ATTENDEE_ENC_KEY`, `NUXT_QR_GRACE_HOURS`); nunca al cliente; nunca cédula en QR/PDF/URLs.
- Rutas públicas (`/e/**`, `/t/**`) excluidas del guard de sesión; layout `public`.
- Decodificación del QR en cliente vía `BarcodeDetector` con entrada manual de respaldo (la decisión de validez es 100% server-side).
- Validación local: `typecheck` OK, `vitest` 59 tests OK, harness RLS/atomicidad OK, `build` OK, E2E sin dependencias OK (flujo completo gated). El usuario debe aplicar las migraciones 0009–0011 en el Supabase remoto, crear el bucket `tickets` y configurar los secretos para validar el flujo completo de extremo a extremo.

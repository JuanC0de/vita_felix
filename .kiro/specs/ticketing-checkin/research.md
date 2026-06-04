# Research & Discovery Log — ticketing-checkin

## Summary
- **Discovery type**: Light/Medium (extensión sobre `platform-foundation` + `event-management`, con investigación puntual de criptografía de tokens, generación de PDF/QR server-side y atomicidad de check-in).
- **Objetivo**: confirmar puntos de integración (RLS, RBAC GATE_STAFF, `events`/`ticket_tiers`), elegir el mecanismo de token QR infalsificable, el almacenamiento del PDF y la estrategia atómica de check-in bajo concurrencia.

## Research Log

### Tema 1: Patrón multi-tenant y registro público (anon)
- **Fuente**: migraciones de la foundation (`0002`–`0004`), `server/utils/supabase.ts`, `event-management`.
- **Hallazgos**: las políticas RLS son `to authenticated`; un visitante sin sesión (anon) no puede insertar bajo RLS. El cliente service-role (`serviceRoleClient`) ya está encapsulado server-only y omite RLS.
- **Implicación**: el registro público se ejecuta server-side con **service role** (no hay usuario que escope la inserción por empresa); la empresa se deriva del evento. El staff (GATE_STAFF) opera con el cliente de usuario (RLS) para validar/check-in, garantizando aislamiento por empresa a nivel DB.

### Tema 2: Token QR infalsificable
- **Decisión previa (roadmap/brief)**: JWT firmado server-side con expiración, payload sin cédula, revocable por estado del ticket en DB; firma HMAC.
- **Hallazgos**: un JWT **HS256** (HMAC-SHA256) con un secreto server-only es suficiente: cualquier alteración del payload invalida la firma; `exp` da expiración; el `sub` referencia el ticket por id opaco (UUID). No se requiere una librería externa: se puede implementar firma/verificación con `node:crypto` (HMAC) en un módulo puro y testeable.
- **Implicación**: módulo único `server/utils/qr-token.ts` (sign/verify) reutilizado por emisión y validación. Secreto en `QR_JWT_SECRET`.

### Tema 3: Protección de la cédula (cifrado + dedup)
- **Decisión de producto**: cédula **cifrada a nivel de aplicación** + **una cédula por evento** (dedup).
- **Tensión**: el cifrado autenticado (AES-256-GCM con IV aleatorio) es no determinista → no permite buscar por cédula para detectar duplicados.
- **Resolución (DD)**: almacenar dos columnas: `cedula_enc` (AES-256-GCM, para que el staff autorizado la recupere) y `cedula_hash` (HMAC-SHA256 determinista, para el `UNIQUE(event_id, cedula_hash)` y la detección de duplicados). El hash no revela la cédula y permite el constraint. Claves en `ATTENDEE_ENC_KEY` (32 bytes base64) y derivación HMAC con dominio separado.

### Tema 4: Generación de PDF + QR server-side y Storage
- **Hallazgos**: `qrcode@1.5.4` genera el QR como PNG (buffer/dataURL) en Node; `pdf-lib@1.17.1` compone el PDF e incrusta el PNG; ambas son JS puras (sin binarios nativos), compatibles con Nitro. El PDF se sube a un bucket **privado** de Supabase Storage; se entrega al asistente mediante una **URL firmada** temporal (el asistente es anónimo).
- **Implicación**: dependencias nuevas `qrcode` y `pdf-lib` (+ `@types/qrcode`). Bucket `tickets` privado; subida y URL firmada vía service role.

### Tema 5: Atomicidad del check-in
- **Hallazgos**: una sentencia `UPDATE tickets SET status='used', used_at=now() WHERE id=? AND status='valid'` es atómica a nivel de fila: Postgres serializa escrituras concurrentes con bloqueo de fila; solo una observa `status='valid'`, la otra afecta 0 filas. Esto garantiza **exactamente un uso** sin necesidad de locks aplicativos. Incluir el evento en el `WHERE` (no cancelado) cubre la revocación por cancelación.
- **Implicación**: el check-in se hace con el **cliente de usuario** (RLS escopa por empresa) mediante ese UPDATE condicional; si afecta 0 filas, una lectura posterior clasifica el motivo (ya usado / anulado / no encontrado / otra empresa). Se registra un `checkin` de auditoría por intento.

## Architecture Pattern Evaluation
- Se mantiene la **arquitectura en capas + defensa en profundidad** de la foundation. La criptografía (JWT/QR, cifrado de cédula) vive en módulos server puros y testeables (criterio `authz.ts`). La atomicidad se delega a la semántica de Postgres (UPDATE condicional), no a lógica aplicativa.

## Design Decisions
- **DD1 — Token QR HS256 propio**: firma/verificación HMAC con `node:crypto`, sin dependencia externa; payload `{ sub: ticketId, iat, exp }`; `exp = event_at + QR_GRACE_HOURS` (default 12h). Revocación real por estado del ticket en DB.
- **DD2 — Cédula: `cedula_enc` (AES-256-GCM) + `cedula_hash` (HMAC)**: cifrado autenticado para confidencialidad; hash determinista para `UNIQUE(event_id, cedula_hash)` y dedup. La cédula nunca va al QR/PDF ni a respuestas públicas.
- **DD3 — Registro público con service role**: el endpoint público inserta attendee+ticket vía service role (anon no pasa RLS); valida input, estado publicado del evento y duplicado antes de insertar; rate limiting básico en memoria por IP.
- **DD4 — PDF privado + URL firmada**: bucket `tickets` privado; el asistente recibe una URL firmada temporal en la pantalla de confirmación.
- **DD5 — Check-in atómico por UPDATE condicional (cliente de usuario, RLS)**: exactamente-un-uso por bloqueo de fila; auditoría en `checkins`.
- **DD6 — Estados del ticket (enum cerrado)**: `valid`, `used`, `void`.

## Risks & Mitigations
- **R1 — Rate limiting en memoria es por instancia**: aceptable como mitigación "básica" (brief). Mitigación futura: store compartido (Redis) — fuera de alcance.
- **R2 — Gestión de secretos**: `QR_JWT_SECRET` y `ATTENDEE_ENC_KEY` son server-only; si se pierden, los QR existentes no se validan y las cédulas no se descifran. Documentar en `.env.example`; nunca exponer al cliente.
- **R3 — URL firmada caduca**: el asistente debe descargar su PDF a tiempo; sin notificaciones (fuera de alcance). La pantalla de confirmación ofrece la descarga inmediata.
- **R4 — Cancelación del evento entre lectura y check-in**: ventana mínima; el `WHERE` del UPDATE incluye `event.status <> 'cancelled'` para cerrarla.

## Synthesis Outcomes
- **Build-vs-adopt**: firma JWT propia con `node:crypto` (evita dependencia) pero se adoptan `qrcode`/`pdf-lib` (generación no trivial, mejor no reinventar).
- **Generalización**: reutilizar el patrón RLS por empresa + denormalización de `company_id` ya establecido en `event-management`.
- **Simplificación**: sin control de cupo en el registro (decisión de producto); estados de ticket mínimos; un ticket por registro.

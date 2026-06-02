# Roadmap

## Overview
SaaS multiempresa (multi-tenant) para la gestión de eventos musicales. Una empresa administra múltiples eventos; cada evento tiene múltiples etapas de boletería (ticket tiers). El público se registra mediante un formulario público y recibe un ticket en PDF con un QR único e infalsificable. El staff de puerta escanea el QR, el sistema lo valida server-side y lo marca como usado de forma atómica. Existe un panel administrativo por empresa con control de acceso por roles.

El proyecto se construye sobre Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS, usando Supabase (Auth, PostgreSQL, Storage) y server routes de Nuxt para toda la lógica crítica. El enfoque elegido es una descomposición vertical por dominio en tres especificaciones entregables de forma independiente y en orden de dependencia.

## Approach Decision
- **Chosen**: Descomposición vertical por dominio en 3 specs (foundation → event-management → ticketing-checkin). Cada spec aporta valor end-to-end y es revisable de forma aislada.
- **Why**: El sistema cruza dominios de responsabilidad bien diferenciados (infraestructura multi-tenant, gestión de catálogo de eventos, y el ciclo de vida del ticket/check-in). Separarlos verticalmente mantiene cada spec por debajo del umbral de complejidad inmanejable y permite revisión adversarial por dominio.
- **Rejected alternatives**:
  - **1 spec monolítico**: generaría 40+ tareas mezclando RLS, RBAC, CRUD de negocio, criptografía de QR, PDF y check-in atómico. Revisión y aprobación por fases inviables.
  - **4+ specs (registration y checkin separados)**: sobre-fragmentación. La generación del ticket y la validación del check-in comparten el esquema del token QR (firma/verificación, payload, expiración); separarlos duplicaría contexto y crearía una costura frágil entre specs.

## Scope
- **In**: Multi-tenancy con aislamiento por empresa (RLS), autenticación y RBAC (SUPER_ADMIN, COMPANY_ADMIN, EVENT_MANAGER, GATE_STAFF), gestión de eventos y etapas de boletería, registro público de asistentes, generación de ticket PDF con QR firmado (JWT, sin cédula en el payload), almacenamiento en Supabase Storage, escáner QR, validación server-side y check-in atómico.
- **Out**: Pasarela de pagos / cobro de boletas, emisión de facturas, reportería avanzada / BI, notificaciones por email/SMS, app móvil nativa, internacionalización de la UI, reventa/transferencia de tickets.

## Constraints
- Stack fijo: Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Supabase Storage.
- Toda la lógica de negocio crítica (generación de QR, generación de PDF, validación de check-in) vive en `server/api` de Nuxt, nunca en componentes Vue.
- Los componentes Vue consumen servicios únicamente a través de composables.
- El QR NO debe contener la cédula directamente. La validación debe ser server-side. El check-in debe ser atómico (sin doble uso).
- Anti-falsificación del QR mediante JWT firmado con expiración, revocable por estado del ticket en la base de datos.

## Boundary Strategy
- **Why this split**: La foundation establece el aislamiento multi-tenant y la seguridad por defecto (RLS + RBAC) que todo lo demás hereda. La gestión de eventos es un dominio CRUD autocontenido sobre esa base. El dominio de ticketing/check-in encapsula el ciclo de vida completo del ticket, donde la generación y la validación comparten intrínsecamente el esquema del token QR.
- **Shared seams to watch**:
  - **Esquema del token QR** (definido en `ticketing-checkin`): payload del JWT, claims, secret/llave de firma, expiración y estrategia de revocación por estado en DB. La generación (ticket) y la validación (check-in) deben usar exactamente el mismo contrato; mantenerlo en un único módulo server-side compartido.
  - **Modelo de roles y RLS** (definido en `platform-foundation`): los specs posteriores dependen de las políticas RLS y de la resolución de `company_id` / rol del usuario. Cualquier nueva tabla debe respetar el patrón de aislamiento establecido.
  - **Tipos TypeScript base** (definidos en `platform-foundation`): tipos de dominio compartidos (roles, company, sesión) reutilizados aguas abajo.

## Specs (dependency order)
- [ ] platform-foundation -- Base Nuxt 4 + Supabase, esquema multi-tenant, RLS, Supabase Auth, RBAC (4 roles), login y shell del dashboard, tipos TS base. Dependencies: none
- [ ] event-management -- CRUD de events y ticket_tiers con servicios y composables; pantallas de listado de eventos, crear evento y configurar boletería. Dependencies: platform-foundation
- [ ] ticketing-checkin -- Registro público de asistentes, generación de ticket PDF con QR JWT firmado (sin cédula), Supabase Storage, escáner QR, validación server-side y check-in atómico. Dependencies: event-management

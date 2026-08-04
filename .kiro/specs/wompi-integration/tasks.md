# Plan de Tareas: wompi-integration

## Fase 1: Base de Datos y Seguridad (Supabase)
- [ ] Crear el archivo de migración SQL `supabase/migrations/0023_wompi_integration.sql`
  - [ ] Agregar las columnas `wompi_enabled`, `wompi_public_key`, `wompi_integrity_secret` y `wompi_events_secret` a la tabla `companies` con restricciones CHECK.
  - [ ] Crear la tabla `payment_transactions` para el registro de órdenes de pago pendientes con formato JSONB para datos de asistentes.
  - [ ] Agregar campos de auditoría `audited_by`, `audited_at` y `audit_note` en `payment_transactions` para registro de soporte manual.
  - [ ] Crear índices de consulta en `payment_transactions` por `reference` y `company_id`.
  - [ ] Habilitar Row Level Security (RLS) en `payment_transactions`.
  - [ ] Definir políticas de RLS para lectura pública por referencia y control administrativo total por empresa o Super Admin.
- [ ] Ejecutar la migración en el entorno local de Supabase.

## Fase 2: Backend (Nitro API & Utils)
- [ ] Crear los tipos TypeScript para transacciones de pago, checkout y contratos de soporte en `app/types/ticketing.ts`.
- [ ] Implementar el endpoint para guardar la configuración de Wompi de la empresa (`PUT /api/admin/companies/[id]/wompi`).
  - [ ] Validar los privilegios del rol administrativo en el backend.
- [ ] Implementar el endpoint de creación de checkout (`POST /api/public/payments/create-checkout`).
  - [ ] Validar aforo actual total en base de datos.
  - [ ] Registrar la orden en `payment_transactions` en estado `'pending'`.
  - [ ] Calcular criptográficamente la firma de integridad de Wompi con SHA-256.
  - [ ] Retornar los parámetros y la firma de integridad al frontend.
- [ ] Implementar el endpoint de Webhook (`POST /api/public/payments/wompi-webhook`).
  - [ ] Extraer el secreto de eventos de Wompi de la empresa asociada.
  - [ ] Validar el checksum `x-event-checksum` del payload recibido de Wompi.
  - [ ] Garantizar la idempotencia comprobando si la referencia ya tiene un estado distinto a `'pending'`.
  - [ ] Si el estado de la transacción es `APPROVED`, ejecutar en una transacción atómica SQL:
    - [ ] Insertar cada asistente en la tabla `attendees` (con cifrado de cédula).
    - [ ] Insertar los tickets correspondientes en `tickets` en estado `'valid'`.
    - [ ] Descontar el cupo de aforo de `ticket_tiers`.
    - [ ] Actualizar el estado de la transacción a `'approved'`.
  - [ ] Generar los PDFs de los tickets en segundo plano y subirlos a Supabase Storage.
  - [ ] Disparar el envío de correos electrónicos automáticos individuales adjuntando los PDFs.
  - [ ] Si la transacción es rechazada (`DECLINED`/`ERROR`), actualizar el estado de la transacción en base de datos.
- [ ] Implementar el endpoint para listar transacciones de soporte (`GET /api/admin/payments/transactions`).
  - [ ] Aplicar lógica multi-tenant (Super Admin ve todos, Company Admin ve solo de su empresa) mediante middleware de roles y RLS.
  - [ ] Permitir filtrado por evento, estado y búsqueda de texto.
- [ ] Implementar el endpoint para forzar la emisión manual (`POST /api/admin/payments/force-issue`).
  - [ ] Verificar que el usuario tenga rol `SUPER_ADMIN` o `COMPANY_ADMIN` sobre la empresa del evento.
  - [ ] Verificar que la transacción esté en estado `'pending'` o `'error'`.
  - [ ] Ejecutar el proceso atómico de creación de asistentes, tickets, PDFs y envío de correos.
  - [ ] Actualizar la transacción a `'approved'` registrando `audited_by` (ID de usuario del admin), `audited_at` y la nota explicativa.

## Fase 3: Frontend (Nuxt/Vue)
- [ ] Implementar la sección de configuración de Wompi en el panel de edición de empresa.
  - [ ] Agregar el switch de "Habilitar Wompi".
  - [ ] Agregar los campos de entrada de texto para las llaves y secretos de Wompi de la empresa con máscaras de seguridad.
- [ ] Rediseñar la página de registro público del evento `/app/pages/e/[eventId]/register.vue`.
  - [ ] Comprobar si el evento pertenece a una empresa con Wompi habilitado.
  - [ ] Si está habilitado, cambiar la UI para mostrar la selección de cantidades por tier.
  - [ ] Renderizar dinámicamente los formularios de datos para cada asistente en base a la cantidad de entradas elegidas.
  - [ ] Al presionar comprar, invocar el endpoint `/api/public/payments/create-checkout`.
  - [ ] Cargar dinámicamente el script del widget de Wompi y llamar a la función de checkout con los parámetros y firma recibidos.
- [ ] Crear la página de confirmación de pago `/app/pages/e/[eventId]/confirm-payment.vue`.
  - [ ] Recibir la referencia de pago de la URL.
  - [ ] Establecer una suscripción mediante Supabase Realtime para escuchar cambios de estado en `payment_transactions` para la referencia específica.
  - [ ] Mostrar un estado animado de "Procesando pago..." mientras la transacción sea `'pending'`.
  - [ ] Si cambia a `'approved'`, mostrar confeti, detalles de los asistentes, y botones de descarga de los PDFs de los tickets de inmediato.
  - [ ] Si cambia a `'declined'` o `'error'`, mostrar el fallo detallado y habilitar un botón de retorno rápido para reintentar la compra.
- [ ] Crear el Panel de Soporte y Auditoría de Pagos en `/app/pages/admin/soporte/pagos.vue`.
  - [ ] Diseñar la tabla de transacciones de pago online.
  - [ ] Integrar el buscador de asistentes, referencia y filtros por estado.
  - [ ] Integrar el modal de confirmación para "Forzar Emisión Manual" donde se solicite ingresar la justificación obligatoria.
  - [ ] Consumir los endpoints de listado y forzado manual del backend.

## Fase 4: Pruebas y Validación
- [ ] Escribir pruebas de integración en `server/utils/wompi.spec.ts` para verificar la generación matemática de la firma de integridad.
- [ ] Validar el flujo de Webhook local simulando un envío de payload de Wompi (Sandbox) con checksum válido.
- [ ] Simular condiciones de aforo agotado concurrentemente para verificar que el webhook no emita boletas de más.
- [ ] Validar la idempotencia del webhook enviando la misma notificación aprobada varias veces consecutivas.
- [ ] Probar la lógica de RLS y visibilidad multi-tenant (Super Admin vs Admin de Empresa) en el listado de transacciones del panel de soporte.
- [ ] Validar que la acción de "Forzar Emisión Manual" registre correctamente la traza de auditoría en la transacción aprobada.

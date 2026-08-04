# Brief: wompi-integration

## Problema
Actualmente, los organizadores de eventos (empresas) no cuentan con un mecanismo automatizado y en línea para recibir pagos por concepto de boletería. Esto limita el proceso de venta, requiriendo registros manuales o conciliaciones offline mediante comprobantes de transferencia física (`transfer_receipt_path`), los cuales deben ser revisados y aprobados de forma manual por el personal administrativo.

Adicionalmente, el formulario de registro público actual procesa los registros de asistentes uno por uno en el frontend de forma secuencial en un ciclo cliente. Si un usuario desea adquirir múltiples boletas de diferentes etapas (ej. dos generales y una VIP) y pagarlas en una sola transacción en línea, el sistema no lo soporta de forma nativa ni atómica.

## Estado Actual
El sistema de boletería permite registros públicos individuales. Cuando el usuario se registra, el sistema inserta inmediatamente el asistente (`attendees`) y el ticket (`tickets`) en estado `'valid'`, genera el PDF del QR y lo envía por correo electrónico sin verificar una transacción de pago en línea previa. Para transacciones manuales, existe la opción de adjuntar un comprobante de transferencia, pero no hay un flujo transaccional asíncrono seguro integrado con pasarelas de pago.

## Resultado Deseado
1. **Configuración Multi-tenant de Pasarela**: Permitir habilitar o deshabilitar la pasarela de pagos Wompi a nivel de empresa (`public.companies`) con un switch/checkbox `wompi_enabled` y almacenar sus credenciales de comercio (`wompi_public_key`, `wompi_integrity_secret`, `wompi_events_secret`) de forma segura.
2. **Formulario de Compra Consolidado (Carrito/Lote)**: Cuando Wompi está activo para la empresa del evento, el formulario de registro de asistentes individual se reemplaza por uno que permite seleccionar múltiples entradas de distintas etapas (`ticket_tiers`) de forma simultánea, ingresar los datos de cada asistente y consolidar la compra.
3. **Checkout Seguro**: Integración del checkout de Wompi (Web Tokenizer o Widget de pagos) en el frontend mediante firmas de integridad generadas en el backend, evitando cualquier manipulación de precios desde el cliente.
4. **Procesamiento de Pago Asíncrono**: Procesar las notificaciones de Wompi mediante un webhook seguro en Nitro API, el cual, al recibir un estado `APPROVED`, creará los registros de asistentes, emitirá los tickets válidos con QR, generará los PDFs, los subirá a Supabase Storage y enviará los correos a los asistentes en un proceso atómico en el servidor.
5. **Monitoreo en Tiempo Real**: Visualización en tiempo real del estado de la transacción para el comprador en el frontend tras ser redirigido de la pasarela.
6. **Panel de Soporte Administrativo (Super Admin & Company Admin)**: Herramienta de auditoría y resolución de disputas para forzar la emisión manual de boletas si hay desconexiones o fallas en las notificaciones del webhook de la pasarela.

## Alcance

### Dentro del Alcance (In)
- Extensión del modelo de base de datos para la configuración de Wompi en empresas.
- Modelo de datos para registrar transacciones/órdenes de pago en estado pendiente (`payment_orders` o `payment_transactions`).
- Endpoint en el backend (`/api/public/payments/create-checkout`) para validar disponibilidad de cupos, registrar la orden de pago y calcular la firma de integridad de Wompi de forma segura.
- Endpoint de Webhook en el backend (`/api/public/payments/wompi-webhook`) para recibir notificaciones asíncronas de Wompi, validar su firma de eventos, crear los asistentes/tickets y disparar el envío de correos.
- Interfaz gráfica en el panel de administración para activar Wompi y guardar llaves de configuración de la empresa.
- Rediseño del formulario público de registro de asistentes para compras por lote si Wompi está activo.
- Sistema de consulta/suscripción en tiempo real en la página de confirmación del pago.
- **Panel de Soporte y Auditoría de Transacciones**: Filtros de transacciones por evento, estado y buscador de datos de asistente (Nombre, Cédula, Correo, Referencia).
- **Acciones de Soporte**: Botón para forzar la aprobación de transacciones pendientes y la consecuente emisión y envío manual de las boletas.
- **Restricción de Visibilidad por Rol (RBAC)**: Los `SUPER_ADMIN` ven todas las transacciones de todas las empresas. Los `COMPANY_ADMIN` o `EVENT_MANAGER` de la empresa del evento ven únicamente las transacciones pertenecientes a su empresa.

### Fuera del Alcance (Out)
- Dispersión automática de fondos entre cuentas de Wompi (cada empresa maneja su propia cuenta y recauda directamente).
- Soporte para devoluciones automáticas (refunds) desde la aplicación web de Vita Felix (las devoluciones se gestionarán manualmente desde el panel de control de Wompi).
- Integración de Wompi para ventas presenciales en puerta (las ventas físicas en puerta seguirán el flujo de caja presencial existente de efectivo, tarjeta externa o transferencia física).

## Candidatos a Límites
- **Módulo de Configuración de Empresa**: Switch y credenciales en el panel administrativo de empresa.
- **Módulo de Transacciones de Pago**: Registro de órdenes pendientes y estados intermedios.
- **Módulo de Checkout y Webhook**: Generación de firmas y procesamiento del callback de Wompi.
- **Módulo de Registro Público Multi-ticket**: Formulario de selección múltiple e ingreso unificado de asistentes.

## Fuera de Límites
- Conciliación de facturas electrónicas exigidas por la DIAN.
- Gestión de disputas y contracargos.

## Upstream / Downstream
- **Upstream**:
  - `platform-foundation` (Autenticación y RLS de empresas).
  - `event-management` (Eventos y configuración de etapas de boletería / tiers).
- **Downstream**:
  - `ticketing-checkin` (Validación de tickets QR emitidos).
  - Módulos futuros de contabilidad y analítica de ventas.

## Touchpoints con Especificaciones Existentes
- **Modifica**: El flujo de registro público en `/app/pages/e/[eventId]/register.vue` y el repositorio de tickets en `tickets-repo.ts` para separar la creación inmediata de la creación diferida sujeta a pago.
- **Adyacente**: `tier-restrictions-and-surcharges` (los límites de capacidad y recargos por etapa deben tenerse en cuenta al calcular el valor total consolidado de la orden en el servidor).

## Restricciones
- La firma de integridad de Wompi debe generarse siempre server-side.
- Las credenciales privadas de Wompi nunca deben exponerse al frontend.
- La confirmación del webhook de Wompi debe ser idempotente (si Wompi reintenta un webhook exitoso, el sistema no debe duplicar la emisión de tickets ni asistentes).

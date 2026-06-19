# Requirements Document

## Introduction
Esta especificación cubre la venta presencial directa en la taquilla de los eventos (puerta) y el control financiero asociado mediante sesiones de caja. La funcionalidad permite al personal en puerta (GATE_STAFF) abrir turnos de caja, registrar ventas de forma ultra rápida (POS en 1 clic) con ingreso inmediato de los asistentes sin el flujo de escaneo QR tradicional, y realizar el arqueo de caja (efectivo y tarjeta) en el cierre de turno para auditar descuadres. Construye sobre las bases de `platform-foundation` para el control de acceso y RLS por empresa, `event-management` para el listado de eventos y etapas de boletería, y `ticketing-checkin` para el control de aforo unificado.

## Boundary Context
- **In scope**:
  - Creación, flujo de estados (abierta, cerrada) y arqueo de sesiones de caja por operario.
  - Registro de ventas rápidas en puerta asociando la etapa de boletería y el método de pago seleccionado.
  - Generación de asistentes genéricos/anónimos para evitar retrasos de registro en puerta y chocar con restricciones de unicidad de identificación.
  - Emisión de tickets virtuales marcados como usados y con timestamp de check-in inmediato al concretar la venta en puerta.
  - Cálculo automático de descuadres (diferencias de efectivo) en el cierre de caja.
  - Visualización y auditoría de ingresos en puerta desglosada por método de pago para roles administrativos.
- **Out of scope**:
  - Integración o comunicación bidireccional por API con datáfonos o lectores de tarjeta físicos externos.
  - Generación y envío por correo electrónico de tickets PDF para ventas presenciales en puerta.
  - Impresión física de comprobantes de pago o tickets de acceso desde la aplicación web.
- **Adjacent expectations**:
  - El sistema asume que `event-management` proporciona la información actualizada de precios, monedas y límites de cupo por etapa de boletería.
  - El sistema asume que `platform-foundation` provee la sesión y rol del operario, aplicando el aislamiento multi-tenant a nivel de base de datos para todas las operaciones de caja y ventas.

## Requirements

### Requirement 1: Apertura de Sesión de Caja
**Objective:** Como staff de puerta, quiero abrir una sesión de caja ingresando el monto base de efectivo inicial, para iniciar mis operaciones de venta de forma auditada.

#### Acceptance Criteria
1. When [el operario accede por primera vez a la interfaz de taquilla física del evento], the [Ticketing Service] shall [solicitar el ingreso del balance inicial de efectivo para abrir la sesión de caja].
2. If [el operario intenta registrar una venta en puerta sin tener una sesión de caja abierta en el evento], then the [Ticketing Service] shall [impedir la transacción e indicar que se requiere la apertura de una sesión de caja].
3. While [un operario tiene una sesión de caja abierta en un evento], the [Ticketing Service] shall [impedir que ese mismo operario inicie una nueva sesión de caja concurrente en el mismo evento].

### Requirement 2: Registro Rápido de Venta en Puerta e Ingreso Directo
**Objective:** Como staff de puerta, quiero registrar una venta física seleccionando la etapa y el método de pago con botones rápidos, para dar paso de inmediato al asistente y evitar filas lentas.

#### Acceptance Criteria
1. When [el operario confirma una venta en puerta seleccionando una etapa de boletería activa y el método de pago], the [Ticketing Service] shall [registrar la transacción financiera, crear un registro de asistente genérico de puerta y emitir un ticket asociado a la sesión de caja en estado 'used' de forma atómica].
2. If [el cupo disponible de la etapa de boletería seleccionada es menor a la cantidad de entradas vendidas], then the [Ticketing Service] shall [rechazar la venta en puerta e indicar al operario la falta de cupo].
3. When [la venta en puerta se procesa y registra exitosamente], the [Ticketing Service] shall [mostrar una confirmación visual prominente en pantalla indicando que el ingreso ha sido admitido].

### Requirement 3: Cierre y Arqueo de Caja
**Objective:** Como staff de puerta, quiero cerrar mi sesión de caja registrando el efectivo físico al final de mi turno, para reportar los ingresos y verificar descuadres financieros.

#### Acceptance Criteria
1. When [el operario solicita el cierre de su sesión de caja], the [Ticketing Service] shall [solicitar el ingreso del monto de efectivo físico contado en caja].
2. When [el operario envía el arqueo final de caja], the [Ticketing Service] shall [calcular la diferencia entre el monto ingresado y el monto esperado (balance inicial más ventas en efectivo de la sesión), registrar el descuadre financiero y marcar la sesión como cerrada].
3. While [una sesión de caja se encuentra en estado cerrado], the [Ticketing Service] shall [denegar cualquier modificación de sus datos, denegar el registro de nuevas ventas bajo esa sesión y bloquear la reapertura de la misma].

### Requirement 4: Reporte e Integración Administrativa de Taquilla
**Objective:** Como administrador del evento, quiero ver el desglose financiero de las ventas físicas por caja y por método de pago, para conciliar los ingresos totales del evento.

#### Acceptance Criteria
1. When [un administrador consulta las estadísticas financieras del evento], the [Ticketing Service] shall [mostrar los ingresos totales obtenidos en puerta divididos por método de pago (efectivo y tarjeta), detallando el estado de cada sesión de caja y los descuadres reportados].
2. Where [el usuario no posee roles de administración o de gestión del evento (EVENT_MANAGER, COMPANY_ADMIN, SUPER_ADMIN)], the [Ticketing Service] shall [denegar el acceso a la consulta detallada de sesiones de caja de otros operarios y a las métricas consolidadas de taquilla].

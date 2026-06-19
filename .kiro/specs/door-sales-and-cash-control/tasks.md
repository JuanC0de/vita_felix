# Implementation Plan

- [ ] 1. Base de Datos e Infraestructura
- [ ] 1.1 Crear migración de base de datos SQL para taquilla y sesiones de caja
  - Crear archivo `supabase/migrations/0020_door_sales_and_cash_control.sql` con las tablas `cash_sessions` y `door_sales`.
  - Agregar campos `channel` y `cash_session_id` a la tabla `tickets`.
  - Crear el índice único parcial `cash_sessions_unique_active_user_idx` para restringir a una sesión activa por operario a la vez.
  - Habilitar RLS en las nuevas tablas y definir políticas de acceso para los roles `GATE_STAFF` y `EVENT_MANAGER`.
  - Crear trigger en base de datos para bloquear inserciones o modificaciones de transacciones si la sesión de caja está en estado `'closed'`.
  - El entregable observable es el script SQL ejecutado con éxito en el entorno local de Supabase.
  - _Requirements: 1.1, 1.3, 2.1, 3.3, 4.2_
  - _Boundary: Database Migrations_

- [ ] 2. Backend y Repositorios
- [ ] 2.1 Implementar repositorio de sesiones de caja cash-repo.ts (P)
  - Crear archivo `server/utils/cash-repo.ts`.
  - Implementar funciones `getActiveSession`, `openSession` y `closeSession` con cálculo matemático de saldo esperado.
  - El entregable observable es el archivo con las firmas y la lógica de base de datos compilando sin errores de tipos.
  - _Requirements: 1.1, 1.3, 3.2, 3.3_
  - _Boundary: server/utils/cash-repo.ts_
  - _Depends: 1.1_

- [ ] 2.2 Extender tickets-repo.ts con la función de venta rápida en puerta (P)
  - Añadir la función `sellTicketAtDoor` en `server/utils/tickets-repo.ts`.
  - La función debe insertar un `attendee` genérico (nombre genérico y hash de cédula aleatorio/UUID) y un `ticket` con canal `'door'` y estado `'used'` con `used_at = now()`, reduciendo cupos de manera transaccional.
  - El entregable observable es la integración compilada en TypeScript y expuesta para el endpoint de API.
  - _Requirements: 2.1, 2.2_
  - _Boundary: server/utils/tickets-repo.ts_
  - _Depends: 1.1_

- [ ] 3. Endpoints de la API
- [ ] 3.1 Implementar controladores de la API para sesiones de caja
  - Crear endpoints `server/api/cash-sessions/open.post.ts`, `close.post.ts`, `active.get.ts`, e `index.get.ts`.
  - Validar los datos de entrada, RLS y roles del usuario en puerta a través del middleware del servidor.
  - El entregable observable son los endpoints respondiendo a llamadas REST en el entorno de desarrollo local.
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 4.2_
  - _Boundary: server/api/cash-sessions_
  - _Depends: 2.1_

- [ ] 3.2 Implementar controlador de venta rápida en puerta
  - Crear endpoint `server/api/events/[id]/door-sales.post.ts`.
  - Comprobar que existe una sesión de caja activa para el usuario antes de procesar el registro del ticket en puerta.
  - El entregable observable es la venta procesada con respuesta HTTP 200 y el ticket marcado de inmediato como usado en base de datos.
  - _Requirements: 2.1, 2.2_
  - _Boundary: server/api/events/[id]/door-sales.post.ts_
  - _Depends: 2.2_

- [ ] 3.3 Extender dashboard.get.ts con reporte de taquilla
  - Modificar `server/api/events/[id]/dashboard.get.ts` para computar y retornar las ventas y sesiones de caja físicas.
  - El entregable observable es la respuesta del dashboard incluyendo el desglose de ingresos por caja y método de pago.
  - _Requirements: 4.1_
  - _Boundary: server/api/events/[id]/dashboard.get.ts_
  - _Depends: 1.1_

- [ ] 4. Interfaz Gráfica (Frontend)
- [ ] 4.1 Extender tipos e interfaces de TypeScript en app/types/ticketing.ts
  - Agregar interfaces para `CashSession`, `DoorSale` y extender `Ticket`.
  - El entregable observable es la compilación del frontend sin errores de tipo TypeScript.
  - _Requirements: 1.1, 2.1_
  - _Boundary: app/types/ticketing.ts_

- [ ] 4.2 Crear la pantalla POS de venta en puerta taquilla.vue (P)
  - Crear página `app/pages/events/[id]/taquilla.vue` con diseño táctil responsive, botones para tiers y selección de método de pago.
  - Integrar estados para indicar ingreso exitoso con alerta verde y sonido.
  - El entregable observable es la pantalla cargando los tiers y procesando ventas simuladas/reales en el navegador.
  - _Requirements: 1.1, 1.2, 2.1, 2.3_
  - _Boundary: app/pages/events/[id]/taquilla.vue_
  - _Depends: 3.2_

- [ ] 4.3 Crear la pantalla de administración y arqueo de turnos de caja cajas.vue (P)
  - Crear página `app/pages/events/[id]/cajas.vue` con el flujo de apertura (monto inicial) y cierre de caja (monto real reportado).
  - El entregable observable es la interfaz cargando el estado actual de la caja del operario y enviando arqueos de cierre.
  - _Requirements: 1.1, 3.1, 3.2, 4.2_
  - _Boundary: app/pages/events/[id]/cajas.vue_
  - _Depends: 3.1_

- [ ] 4.4 Modificar scan.vue para agregar acceso rápido (P)
  - Modificar `app/pages/scan.vue` agregando un botón destacado para navegar directamente a la taquilla física del evento.
  - El entregable observable es la presencia del botón funcional en la pantalla del staff de puerta.
  - _Requirements: 2.1_
  - _Boundary: app/pages/scan.vue_

- [ ] 4.5 Integrar reportes financieros en el dashboard del evento
  - Modificar `app/pages/events/[id]/dashboard.vue` para pintar las tarjetas de ingresos financieros recaudados en puerta desglosados.
  - El entregable observable es el panel de métricas actualizando las gráficas e ingresos unificados.
  - _Requirements: 4.1_
  - _Boundary: app/pages/events/[id]/dashboard.vue_
  - _Depends: 3.3_

- [ ] 5. Validación y Pruebas
- [ ] 5.1 Implementar pruebas automatizadas de integración para la lógica de caja y venta en puerta
  - Crear pruebas en la carpeta de tests que simulen la apertura de caja, venta directa concurrente, y cierre con cálculo de diferencias.
  - El entregable observable es el reporte de pruebas pasando de forma exitosa en la suite de vitest.
  - _Requirements: 1.1, 2.1, 3.2, 3.3_
  - _Boundary: Tests_
  - _Depends: 3.2_

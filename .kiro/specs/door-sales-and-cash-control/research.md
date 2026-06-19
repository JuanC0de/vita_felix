# Gap Analysis: door-sales-and-cash-control

## 1. Current State Investigation

El sistema actual gestiona el registro de asistentes, la emisión de boletos con códigos QR basados en firmas JWT, la validación server-side, el almacenamiento de comprobantes de transferencia y los excedentes horarios mediante las siguientes costuras técnicas:
- **Base de Datos (Supabase/Postgres)**:
  - `tickets`: Almacena el identificador del boleto, su estado (`valid`, `used`, `void`), fecha de uso, ruta del PDF y del comprobante.
  - `attendees`: Almacena el nombre del asistente, correo, y la cédula cifrada junto con su hash determinista.
  - `checkins`: Registro de auditoría para cada intento de check-in.
- **Lógica de Servidor (Nuxt Server Routes)**:
  - `server/utils/tickets-repo.ts`: Contiene la lógica transaccional de registro (`registerAndIssue`) y validación (`checkinTicket`).
  - `server/api/checkin/validate.post.ts` y `server/api/public/register.post.ts`: Endpoints que exponen la lógica al frontend.
- **Interfaz Gráfica (Vue 3/Nuxt 4)**:
  - `app/pages/scan.vue`: Pantalla del staff de puerta para escanear y validar boletos mediante cámara.
  - `app/pages/events/[id]/dashboard.vue`: Panel del evento con métricas básicas de tickets emitidos y usados.

### Gaps Técnicos Identificados:
- **Ausencia de Control de Turnos/Sesiones**: No existen entidades ni endpoints para abrir o cerrar sesiones de caja de operarios de taquilla.
- **Falta de Trazabilidad Financiera Directa**: No hay almacenamiento del monto real recaudado en puerta ni desglose por método de pago.
- **Restricción de Cédula Única**: La restricción `unique (event_id, cedula_hash)` en la tabla `attendees` impide registrar múltiples ventas rápidas sin datos reales o de forma anónima.
- **Falta de Interfaz POS**: No existe una pantalla con controles rápidos para el registro de ventas directas presenciales.

---

## 2. Requirements Feasibility Analysis

### Mapeo de Requerimientos a Activos Técnicos

| Requerimiento | Activos Técnicos Necesarios | Estado | Notas / Riesgos |
| :--- | :--- | :--- | :--- |
| **Req 1: Apertura de Caja** | Tabla `cash_sessions` + Endpoint POST/GET para abrir turno + UI de apertura de caja | **Missing** | Se debe garantizar que no haya más de una sesión abierta por operario a la vez en un evento. |
| **Req 2: Registro Rápido** | Endpoint POST para procesar venta directa + UI POS con botones táctiles por etapa | **Missing** | Requiere la inserción atómica de asistente genérico, ticket en estado `used` y registro en `door_sales`. |
| **Req 3: Cierre de Caja** | Endpoint POST para enviar arqueo final y cálculo de diferencias + UI de cierre | **Missing** | Bloqueo estricto del turno una vez cerrado para evitar adulteración de balances financieros. |
| **Req 4: Reporte Administrativo** | Modificación de `dashboard.get.ts` + UI en el dashboard de administrador del evento | **Missing** | Consolidar ingresos en puerta con los reportes de ventas generales en línea. |

### Riesgos y Restricciones:
- **Concurrencia**: Las ventas en puerta decrementan la capacidad física de las etapas (`quota` en [ticket_tiers](file:///Users/juandresbo/_Developer/vita_felix/supabase/migrations/0007_ticket_tiers.sql)) de forma concurrente con el formulario público. La validación del remanente de aforo debe ser atómica (se recomienda usar transacciones SQL en Postgres).
- **Rendimiento**: En condiciones de ingreso masivo, los endpoints de caja y venta rápida no deben realizar operaciones costosas como generación de PDFs, firmas JWT complejas o envíos de correo. El ticket en puerta se marca como utilizado de manera directa.

---

## 3. Implementation Approach Options

### Opción A: Extender Componentes Existentes
Consiste en añadir la lógica de ventas en puerta dentro de las estructuras de registro público existentes en `tickets-repo.ts` y reutilizar las pantallas de escaneo añadiendo un modal de venta rápida.
- **Pros**:
  - Reutilización inmediata de flujos de código.
  - Menor número de archivos nuevos.
- **Cons**:
  - Alta complejidad en los componentes existentes.
  - Sobrecarga de lógica en los controladores actuales y peligro de romper el comportamiento del check-in por escaneo de QR.
- **Riesgo**: Medio.

### Opción B: Crear Módulo de Taquilla Independiente
Consiste en implementar tablas y componentes de frontend completamente separados para las ventas físicas presenciales, sin generar registros de tickets.
- **Pros**:
  - Desacoplamiento total, menor riesgo de afectar la base del código actual.
- **Cons**:
  - Requiere refactorizar todas las consultas de aforo, analíticas y exportaciones del dashboard del administrador para sumar las dos fuentes de datos.
- **Riesgo**: Alto.

### Opción C: Enfoque Híbrido (Recomendado)
Consiste en crear un nuevo flujo de endpoints y componentes UI de taquilla aislados, pero integrando el resultado en el modelo de base de datos de `tickets` y `attendees` preexistente a través de un canal `'door'`.
- **Pros**:
  - Separación de responsabilidades clara a nivel de código de frontend y backend.
  - Integración nativa del aforo e ingresos en el dashboard de administración sin requerir refactorizaciones masivas.
  - El aforo se sigue calculando sumando tickets con estado `used`.
- **Cons**:
  - Requiere extender el esquema de base de datos actual para añadir el canal `'door'` en `tickets` y relaciones financieras.
- **Riesgo**: Bajo.

---

## 4. Implementation Complexity & Risk

- **Esfuerzo Estimado**: **M (Media: 4 a 6 días)**
  - Requiere crear 2 nuevas tablas SQL, políticas RLS correspondientes, endpoints de sesión de caja y venta rápida, y 2 pantallas nuevas de UI (POS y administración de cajas).
- **Riesgo**: **Bajo**
  - Los patrones del proyecto (Supabase, Nuxt Server Routes, composables, RLS) están bien establecidos y el enfoque híbrido minimiza el impacto en componentes críticos ya en producción.

---

## 5. Recomendaciones para la Fase de Diseño

1. **Estructura de Base de Datos**: Crear las tablas `cash_sessions` y `door_sales` vinculadas por llaves foráneas a `companies` y `events` para heredar las políticas RLS. Modificar `tickets` añadiendo el campo `channel` con un valor por defecto de `'online'`.
2. **Atomicidad**: Implementar la lógica de venta rápida en puerta y decremento de cupos en una sola transacción SQL en Supabase para mitigar condiciones de carrera de aforo.
3. **Flujo de Asistente Genérico**: En el backend, generar un UUID dinámico para el campo `cedula_hash` del asistente presencial anónimo, asegurando que no existan choques por el índice único de la tabla `attendees`.

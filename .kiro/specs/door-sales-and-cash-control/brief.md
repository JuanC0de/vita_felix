# Brief: door-sales-and-cash-control

## Problem
El staff de puerta (GATE_STAFF) no dispone de un mecanismo para registrar transacciones de venta presencial directa (taquilla física) durante el evento. Intentar utilizar el registro público en línea con generación de PDF y posterior escaneo QR es inviable debido a los tiempos de espera prolongados y la aglomeración de personas en el acceso. Adicionalmente, no se cuenta con un control financiero que registre qué etapas de boletería se vendieron físicamente y cuánto dinero en efectivo o tarjeta debe haber en poder del personal de puerta al final de la jornada.

## Current State
Actualmente, el sistema solo admite la emisión de tickets mediante registro público en línea (`registerAndIssue` en `tickets-repo.ts`) y validación server-side mediante lectura de código QR (`checkinTicket`). Los reportes de aforo y ventas se calculan asumiendo que todos los tickets válidos provienen de compras o registros en línea previos. No hay soporte para sesiones de caja ni para registrar ingresos financieros directos en taquilla física.

## Desired Outcome
1. Un panel de venta ultra rápido (POS) para el personal de puerta que permita registrar una venta y autorizar el ingreso de un asistente en menos de 3 segundos (1 o 2 taps).
2. Trazabilidad del aforo en tiempo real unificada, integrando las ventas físicas presenciales como tickets usados.
3. Control financiero y auditoría de caja mediante flujos de apertura, registro de transacciones (efectivo/tarjeta) y cierre de caja con cálculo de descuadres.

## Scope
- **In**:
  - Modelos de datos para sesiones de caja (`cash_sessions`) y transacciones en puerta (`door_sales`).
  - Reglas de aislamiento multi-tenant y políticas RLS para garantizar que un operario solo gestione y visualice datos de su empresa.
  - Endpoint server-side atómico para el procesamiento de venta en puerta rápida (inserción de asistente genérico, inserción de ticket directo en estado `used`, registro de transacción en caja).
  - Interfaz gráfica optimizada para móviles/tabletas (POS) que permita seleccionar la etapa de boletería y el método de pago con botones grandes.
  - Flujo administrativo de apertura y cierre de caja con cálculo de descuadres (sobrantes y faltantes de efectivo).
- **Out**:
  - Integración nativa por API con datáfonos o pasarelas de pago físico (el operario registra manualmente si el cobro se realizó mediante tarjeta en un datáfono externo).
  - Impresión física de comprobantes térmicos o pulseras (se asume que el operario entrega un distintivo físico externo tras la aprobación visual en pantalla).

## Boundary Candidates
- **Módulo de Caja**: Control de turnos (`cash_sessions`) y arqueo de caja (apertura/cierre).
- **Módulo de Transacciones POS**: Registro rápido de transacciones financieras directas por etapa (`door_sales`).
- **Módulo de Ingreso Directo**: Lógica de base de datos y endpoints que generan tickets ya marcados como ingresados (`used`) asociados a un canal presencial (`'door'`).

## Out of Boundary
- Control de inventario de insumos físicos (pulseras, boletería física preimpresa).
- Conciliación bancaria automatizada.

## Upstream / Downstream
- **Upstream**:
  - `platform-foundation` (Aislamiento de empresas por RLS y roles `GATE_STAFF`, `EVENT_MANAGER`).
  - `event-management` (Catálogo de eventos y etapas de boletería activas).
  - `ticketing-checkin` (Estructura de tickets, registro de asistentes y auditoría en `checkins`).
- **Downstream**:
  - Módulos futuros de contabilidad o reportes financieros avanzados consolidando ventas online y presenciales.

## Existing Spec Touchpoints
- **Extends**: [ticketing-checkin](file:///Users/juandresbo/_Developer/vita_felix/.kiro/specs/ticketing-checkin/requirements.md) (agrega el canal `'door'` en `tickets` y automatiza la inserción en estado `used` omitiendo el envío de PDF por email).
- **Adjacent**: [tier-restrictions-and-surcharges](file:///Users/juandresbo/_Developer/vita_felix/.kiro/specs/tier-restrictions-and-surcharges/spec.json) (las ventas en puerta deben respetar los límites de capacidad definidos para cada etapa).

## Constraints
- Procesamiento en servidor para garantizar que las transacciones y decrementos de cupos sean atómicos.
- Interfaz web altamente responsiva que no dependa de animaciones pesadas o flujos de confirmación multipaso para evitar cuellos de botella en la puerta.
- Compatibilidad absoluta con las consultas y triggers de aforo existentes.

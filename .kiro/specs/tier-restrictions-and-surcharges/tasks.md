# Plan de Implementación

## Lista de Tareas

### 1. Cambios en Base de Datos
- [ ] 1.1 Crear archivo de migración `0019_add_tier_limits_and_surcharge.sql`
  - Añadir columnas `entry_time_limit` y `surcharge_amount` a `ticket_tiers`.
  - Añadir columnas `surcharge_applied` y `surcharge_paid` a `checkins`.
  - _Requirements: 2.3, 3.4_
- [ ] 1.2 Actualizar la función SQL `public.checkin_ticket`
  - Comparar la hora del check-in contra la hora de inicio del evento y el límite de la etapa.
  - Implementar la lógica para cruce de medianoche en la validación horaria.
  - Registrar la aplicación del recargo y el cobro del excedente en la tabla `checkins`.
  - _Requirements: 3.1, 3.2, 3.4_

### 2. Modelos, Validación y Backend
- [ ] 2.1 Actualizar contratos y tipos TypeScript
  - Modificar `app/types/events.ts` para incluir los nuevos campos del tier.
  - Modificar `app/types/ticketing.ts` para incluir `surchargeApplied` y `surchargeAmount` en el resultado del check-in.
  - _Requirements: 2.1, 2.2, 3.2_
- [ ] 2.2 Actualizar validaciones e inserciones de etapas
  - Modificar `server/utils/events-validation.ts` para validar `entryTimeLimit` y `surchargeAmount`.
  - Modificar `server/utils/events-repo.ts` (`mapTier`, `createTier`, `updateTier`) para persistir y retornar los nuevos campos.
  - _Requirements: 2.1, 2.2, 2.3_
- [ ] 2.3 Actualizar endpoint de check-in y envío de tickets
  - Modificar `server/utils/tickets-repo.ts` para retornar los nuevos campos del check-in.
  - Modificar `server/utils/ticket-pdf.ts` y el correo de confirmación para renderizar la hora límite si existe.
  - _Requirements: 3.2, 4.1, 4.2_

### 3. Registro Público
- [ ] 3.1 Implementar bloqueo de etapa por URL
  - Leer el parámetro de consulta `tier` en `app/pages/e/[eventId]/register.vue`.
  - Filtrar las opciones del selector de etapa en `app/components/ticketing/RegistrationForm.vue` si el parámetro de consulta está presente.
  - Deshabilitar el selector de etapas en el formulario cuando el parámetro esté presente.
  - _Requirements: 1.1, 1.2, 1.3_

### 4. Administración y Panel de Escáner
- [ ] 4.1 Implementar edición y enlaces en administración
  - Añadir campos de entrada de hora límite y recargo en `app/components/events/TicketTierForm.vue`.
  - Modificar `app/pages/events/[id]/tickets.vue` para mostrar los límites configurados y proveer el botón de copiar enlace directo.
  - _Requirements: 2.1, 2.2, 2.3_
- [ ] 4.2 Implementar advertencia de recargo en el escáner
  - Modificar `app/pages/scan.vue` para renderizar el bloque de alerta de color ámbar con el monto a cobrar si `surchargeApplied` es `true`.
  - Mostrar la alerta y el desglose del cobro en el historial de ingresos de la sesión.
  - _Requirements: 3.3, 3.4_

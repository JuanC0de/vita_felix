# Plan de Tareas de Implementación

- [ ] 1. Base de Datos y Tipos TypeScript
  - [ ] 1.1 Crear la migración `0013_event_flyer.sql` agregando la columna `flyer_url` a la tabla `events` (P).
    - _Requirements: 3_
  - [ ] 1.2 Actualizar `database.types.ts` incorporando la definición de `flyer_url` en la tabla de eventos.
    - _Requirements: 3_
  - [ ] 1.3 Declarar el atributo `flyerUrl` en los modelos lógicos de `app/types/events.ts` y `app/types/ticketing.ts` (P).
    - _Requirements: 3_
    - _Depends: 1.2_

- [ ] 2. Servicios del Servidor y API (Backend)
  - [ ] 2.1 Actualizar los métodos CRUD de `server/utils/events-repo.ts` para persistir y retornar `flyer_url`.
    - _Requirements: 3_
    - _Depends: 1.3_
  - [ ] 2.2 Sincronizar el cargador público del evento en `server/utils/tickets-repo.ts` (`getPublicEvent`) para incluir `flyerUrl`.
    - _Requirements: 3_
    - _Depends: 1.3_
  - [ ] 2.3 Añadir la regla de validación de `flyerUrl` en `server/utils/events-validation.ts`.
    - _Requirements: 3_
    - _Depends: 1.3_
  - [ ] 2.4 Implementar el endpoint administrativo `POST /api/events/[id]/attendees.post.ts` que valida el rol del usuario y emite la entrada del asistente mediante `registerAndIssue`.
    - _Requirements: 1_
    - _Depends: 2.2_

- [ ] 3. Formularios y Pantallas en el Administrador
  - [ ] 3.1 Añadir el campo "Flyer URL" con previsualización responsive en la pantalla de datos del evento `app/pages/events/[id]/index.vue`.
    - _Requirements: 3_
    - _Depends: 2.1_
  - [ ] 3.2 Integrar el modal "Registrar Asistente" y la lógica de copiado para WhatsApp en el listado de asistentes `app/pages/events/[id]/attendees.vue`.
    - _Requirements: 1_
    - _Depends: 2.4_

- [ ] 4. Portal Público y Registro Grupal
  - [ ] 4.1 Modificar el formulario `RegistrationForm.vue` para soportar dinámicamente un arreglo de campos para acompañantes (P).
    - _Requirements: 2_
  - [ ] 4.2 Rediseñar la página de registro público `app/pages/e/[eventId]/register.vue` a doble columna, incorporando el Flyer HD en desktop y procesamiento de registros en lote con indicador de progreso.
    - _Requirements: 2, 3_
    - _Depends: 4.1, 2.2_

- [ ] 5. Pruebas y Validación
  - [ ] 5.1 Agregar caso de prueba unitaria en `events-validation.spec.ts` y asegurar que la suite completa pase (`npm run typecheck` y `npm run test`).
    - _Requirements: 1, 2, 3_
    - _Depends: 2.3_

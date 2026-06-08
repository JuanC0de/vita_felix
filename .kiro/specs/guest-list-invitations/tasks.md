# Implementation Plan: Lista de Invitaciones y Cortesías

## 1. Cimiento: Base de Datos y Persistencia
- [ ] 1. Configuración de Base de Datos y Seguridad RLS
- [ ] 1.1 Configurar el esquema físico de base de datos para anfitriones y la relación de invitados
  - Modificar las entidades existentes para soportar el identificador del anfitrión en la tabla de asistentes.
  - Crear la estructura física de la tabla para almacenar la información de los anfitriones (`event_hosts`), incluyendo sus límites de cortesías y tokens seguros.
  - Habilitar Row Level Security (RLS) en la nueva tabla y crear las políticas correspondientes de acceso por inquilino y acceso público mediante token.
  - Al completar la migración, las nuevas estructuras de base de datos se aplicarán exitosamente en la base de datos de desarrollo.
  - _Requirements: 1.1, 3.1_
- [ ] 1.2 Implementar la transacción atómica de registro de invitado en base de datos
  - Crear una función almacenada en base de datos que encapsule de manera atómica la validación del token de invitación, el conteo de cortesías restantes para el anfitrión (aplicando bloqueos para evitar concurrencia), la inserción segura de los datos del asistente cifrando la cédula, y la creación del ticket.
  - Retornar el identificador del asistente creado si la transacción es exitosa o lanzar excepciones específicas con códigos de error si se excede el límite o el token es inválido.
  - Al finalizar, la función transaccional almacenada estará disponible y responderá correctamente ante intentos de registro.
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.1_

## 2. Núcleo: API Server y Backend
- [ ] 2. Servicios del Backend Nitro
- [ ] 2.1 (P) Implementar el repositorio de persistencia para anfitriones
  - Escribir la lógica del repositorio Nitro para manejar la lectura, creación y conteo de cortesías de los anfitriones de un evento en base de datos.
  - Proveer funciones para validar tokens, recuperar la información pública de un anfitrión y sus estadísticas de uso.
  - Al finalizar, las pruebas del repositorio responderán con éxito y el código estará tipado de forma segura sin tipos implícitos.
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: EventHostsRepo_
- [ ] 2.2 (P) Implementar el endpoint para la creación de anfitriones
  - Crear el controlador de API protegido por rol de organizador que capture las entradas (nombre del anfitrión, límite de cortesías) y genere el token hexadecimal seguro guardándolo en base de datos.
  - Retornar el objeto del anfitrión con la URL del enlace único construida.
  - Al finalizar, una petición autenticada creará el anfitrión y devolverá el token con éxito.
  - _Requirements: 1.1, 1.2_
  - _Boundary: ApiEventsHostsPost_
  - _Depends: 2.1_
- [ ] 2.3 (P) Implementar el endpoint para el listado de anfitriones
  - Crear el controlador de API protegido por rol de organizador que retorne el listado de todos los anfitriones de un evento con sus contadores de invitados.
  - Al finalizar, una petición GET autenticada devolverá el listado y sus estados de consumo con éxito.
  - _Requirements: 1.4_
  - _Boundary: ApiEventsHostsGet_
  - _Depends: 2.1_
- [ ] 2.4 (P) Implementar el endpoint público para consultar el estado de la invitación
  - Crear el controlador de API público (sin sesión) que reciba el token, valide si es activo y si aún quedan cupos de cortesía disponibles para el anfitrión.
  - Retornar la información pública del evento y del anfitrión, o lanzar errores HTTP apropiados si no está activo o se agotó el cupo.
  - Al finalizar, una petición GET pública responderá con los datos de invitación válidos si hay cupos.
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: ApiPublicInviteStatusGet_
  - _Depends: 2.1_
- [ ] 2.5 (P) Implementar el endpoint público para el registro final de la invitación
  - Crear el controlador de API público que reciba los datos del invitado (nombre, correo, cédula) junto con el token.
  - Invocar la función almacenada atómica en base de datos, descifrando/encriptando la cédula y controlando la concurrencia.
  - Integrar el generador de PDF para emitir el ticket de cortesía correspondiente y mandarlo por correo al usuario.
  - Al finalizar, una petición POST registrará al asistente con éxito, restando un cupo al anfitrión y enviándole el ticket PDF por correo.
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_
  - _Boundary: ApiPublicInviteRegisterPost_
  - _Depends: 2.1_

## 3. Interfaces de Usuario: Frontend Web
- [ ] 3. Vistas del Frontend Nuxt
- [ ] 3.1 (P) Crear el formulario público de registro de invitados
  - Desarrollar la vista web pública cargada por token de invitación que valide dinámicamente el estado del enlace al cargar.
  - Mostrar el formulario de captura si el token es válido y quedan cupos, aplicando las validaciones de campos del cliente (correo, nombre, cédula).
  - Integrar el envío del formulario con el endpoint de registro, mostrando pantallas elegantes de carga, éxito final y error si hay duplicados o cupo agotado.
  - Al completar, la página renderizará de forma responsive y permitirá el registro correcto de un invitado desde dispositivos móviles.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Boundary: PageInviteForm_
  - _Depends: 2.4, 2.5_
- [ ] 3.2 (P) Crear el panel de gestión de anfitriones para el organizador
  - Integrar una nueva pestaña en el dashboard de administrador de eventos que muestre el listado de anfitriones, su progreso de cupos consumidos y la opción para registrar nuevos anfitriones asignando límites.
  - Proporcionar la funcionalidad de copiar el enlace de invitación único al portapapeles.
  - Al completar, el organizador podrá crear anfitriones de forma interactiva y visualizar el progreso de cada lista de cortesías.
  - _Requirements: 1.1, 1.3, 1.4_
  - _Boundary: PageAdminEventHosts_
  - _Depends: 2.2, 2.3_

## 4. Validación: Pruebas e Integración
- [ ] 4. Pruebas y Validación final
- [ ] 4.1 Escribir pruebas unitarias e integración de flujos
  - Crear pruebas unitarias para el repositorio de anfitriones verificando la creación y lectura correcta de datos.
  - Escribir pruebas de integración sobre la función SQL en base de datos simulando el registro atómico concurrente de múltiples peticiones sobre el último cupo de cortesía del anfitrión para validar que no se exceda.
  - Al completar, la suite de pruebas unitarias y de integración (`npm run test`) se ejecutará con éxito reportando 100% de cobertura en la nueva lógica del backend.
  - _Requirements: 2.2, 2.5_
  - _Boundary: TestsIntegration_
  - _Depends: 1.2, 2.1_

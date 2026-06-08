# Requirements Document

## Introduction
Este documento define los requisitos funcionales para el sistema de lista de invitados y cortesías automatizadas. Permite a los organizadores de eventos asignar anfitriones (DJs, socios, relaciones públicas) con cupos de cortesía limitados y generar enlaces de invitación únicos para automatizar el registro de sus invitados de forma segura y atómica.

## Boundary Context
- **In scope**:
  - Registro de anfitriones con rol y cupo máximo de invitados (`max_guests`) por evento.
  - Generación de tokens seguros y enlaces web únicos para el registro de invitados por anfitrión.
  - Formulario de registro público validado por token para capturar nombre completo, correo y cédula.
  - Validación de cupos en base de datos con control de concurrencia para evitar sobrepasar los límites de los anfitriones.
  - Cifrado de cédulas de invitados conforme a las políticas del proyecto.
  - Emisión automatizada de boletas de cortesía y envío del PDF al correo electrónico.
- **Out of scope**:
  - Panel de administración o credenciales de acceso para los anfitriones (DJs/socios). Los enlaces son autogestionados por el organizador y compartidos por canales externos.
  - Modificación de los límites del evento total (el sistema asume que la cortesía respeta el aforo global del evento o lo maneja administrativamente).
- **Adjacent expectations**:
  - El sistema depende del servicio de envío de correos existente para entregar los tickets en formato PDF.
  - El sistema depende del servicio de criptografía de asistentes existente para realizar el cifrado/hashing de cédulas.

## Requirements

### Requirement 1: Administración de Anfitriones (Event Hosts)
**Objective:** As a organizador de eventos, I want registrar anfitriones y generar enlaces de invitación, so that pueda asignarles cortesías sin tener que recopilar sus datos manualmente.

#### Acceptance Criteria
1. When el organizador registra un nuevo anfitrión con nombre y cupo de invitados, the Invitations Service shall crear el registro del anfitrión y asociarlo al evento.
2. When se registra el anfitrión, the Invitations Service shall generar un token único y seguro de 32 caracteres hexadecimales.
3. The Invitations Service shall construir un enlace público utilizando el token generado para que el organizador pueda compartirlo con el anfitrión.
4. While el organizador visualiza el panel de administración, the Invitations Service shall mostrar el listado de anfitriones, sus límites asignados y la cantidad actual de invitados registrados.

### Requirement 2: Registro de Invitados (Guest Registration)
**Objective:** As a invitado especial, I want ingresar mis datos a través del formulario de invitación, so that pueda obtener mi ticket de cortesía para el evento.

#### Acceptance Criteria
1. When un usuario ingresa al enlace de invitación, the Invitations Service shall verificar que el token exista y que corresponda a un evento activo.
2. If el token no es válido o el evento no se encuentra activo, then the Invitations Service shall mostrar un mensaje indicando que el enlace es inválido.
3. If el conteo de invitados registrados de ese anfitrión es igual o mayor a su cupo límite, then the Invitations Service shall denegar el acceso al formulario y mostrar un mensaje indicando que los cupos se han agotado.
4. While el token sea válido y existan cupos disponibles, the Invitations Service shall desplegar un formulario para capturar el nombre completo, correo electrónico y cédula del invitado.
5. If el hash de la cédula ingresada ya existe para el mismo evento, then the Invitations Service shall rechazar el registro e informar al usuario del duplicado.
6. When el usuario envía el formulario, the Invitations Service shall cifrar la cédula y generar el hash determinista antes de su almacenamiento en la base de datos.

### Requirement 3: Emisión de Boletas de Cortesía
**Objective:** As a sistema de boletaje, I want generar y enviar la boleta de cortesía de forma automatizada, so that el invitado pueda acceder al evento y el anfitrión pueda ver su progreso de cupos.

#### Acceptance Criteria
1. When el registro de datos del invitado se procesa con éxito, the Invitations Service shall crear la cortesía en estado válido y asociarla al anfitrión en la base de datos.
2. When se crea el ticket de cortesía, the Invitations Service shall generar un código QR y el documento PDF del ticket.
3. When el PDF del ticket está listo, the Invitations Service shall enviarlo de manera automatizada al correo electrónico del invitado registrado.

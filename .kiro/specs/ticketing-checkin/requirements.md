# Requirements Document

## Introduction
Esta especificación cubre el ciclo de vida completo del ticket dentro del SaaS multiempresa: el registro público de asistentes a un evento, la emisión de un ticket con un código QR único e infalsificable entregado en PDF, y la validación en puerta por parte del staff, con un check-in atómico que impide el doble ingreso. Construye sobre `platform-foundation` (multi-tenancy, RLS, RBAC con el rol GATE_STAFF, sesión) y sobre `event-management` (catálogo de `events` y `ticket_tiers`).

El alcance se limita a comportamientos observables por el asistente del público, por el staff de puerta y por el operador de la plataforma. Las decisiones de arquitectura interna, el modelo de datos detallado, los algoritmos criptográficos y la elección de bibliotecas se difieren a la fase de diseño. El stack está fijado como restricción del proyecto, pero los criterios de aceptación se expresan de forma independiente de la tecnología siempre que es posible.

## Boundary Context
- **In scope**: Registro público (sin autenticación) de asistentes a un evento publicado; almacenamiento seguro de los datos del asistente (la cédula nunca viaja en el QR ni se expone públicamente); emisión de un ticket por registro con un identificador opaco; generación de un código QR firmado y verificable con expiración; generación del ticket en PDF y su almacenamiento; pantalla de confirmación con el ticket; pantalla de escaneo para GATE_STAFF; validación server-side del QR (firma + expiración + estado); check-in atómico que garantiza exactamente un uso por ticket; registro de auditoría de cada intento de check-in.
- **Out of scope**: Setup base, autenticación y RBAC (`platform-foundation`); CRUD de eventos y etapas de boletería (`event-management`); pagos/cobro de boletas, facturación, notificaciones por correo/SMS, reventa o transferencia de tickets, reportería/analítica; control de cupo en el registro (se emite sin validar el cupo del tier en esta versión).
- **Adjacent expectations**: Esta especificación asume que `event-management` provee eventos con un estado que indica si están abiertos al registro (solo los publicados aceptan registro) y `ticket_tiers` con su moneda/precio; y que `platform-foundation` provee la identidad, empresa y rol del usuario de puerta (GATE_STAFF) y el aislamiento por empresa que estas tablas heredan. No redefine esos contratos.

## Requirements

### Requirement 1: Registro público de asistentes
**Objective:** Como asistente del público, quiero registrarme a un evento mediante un formulario público, para obtener mi ticket sin necesidad de tener una cuenta.

#### Acceptance Criteria
1. When [un visitante abre el formulario público de un evento publicado y envía datos válidos (nombre, cédula, correo y la etapa de boletería elegida)], the Ticketing Service shall [registrar al asistente y emitir un ticket asociado a ese asistente, esa etapa de boletería y ese evento].
2. If [el visitante envía el formulario con campos faltantes o con formato inválido], then the Ticketing Service shall [rechazar el registro e indicar qué campos son inválidos, sin crear asistente ni ticket].
3. While [un evento no está en estado publicado], when [un visitante intenta registrarse a ese evento], the Ticketing Service shall [rechazar el registro e indicar que el evento no está disponible para registro].
4. If [una cédula ya tiene un ticket para el mismo evento], then the Ticketing Service shall [rechazar el nuevo registro e indicar que ya existe un registro para esa cédula en ese evento].
5. The Ticketing Service shall [no requerir autenticación para el registro público].
6. The Ticketing Service shall [aplicar una limitación básica de tasa al endpoint público de registro para mitigar el abuso automatizado].

### Requirement 2: Protección de los datos del asistente
**Objective:** Como operador de la plataforma, quiero que los datos sensibles del asistente queden protegidos, para cumplir con la confidencialidad y evitar fugas.

#### Acceptance Criteria
1. The Ticketing Service shall [almacenar la cédula del asistente de forma cifrada, de modo que no quede legible en texto plano en el almacenamiento].
2. The Ticketing Service shall [no incluir nunca la cédula del asistente en el código QR ni en el contenido verificable del ticket].
3. While [una petición no proviene de un usuario autenticado con acceso a la empresa dueña del evento], the Ticketing Service shall [no exponer la cédula ni los datos personales del asistente].
4. The Ticketing Service shall [aislar los asistentes, tickets y check-ins por empresa, heredando el patrón de aislamiento de la plataforma].
5. Where [un usuario tiene el rol SUPER_ADMIN], the Ticketing Service shall [permitir el acceso transversal a los datos de todas las empresas].

### Requirement 3: Código QR único e infalsificable
**Objective:** Como operador de la plataforma, quiero que cada ticket tenga un QR que no pueda falsificarse ni adivinarse, para garantizar la autenticidad en la puerta.

#### Acceptance Criteria
1. When [se emite un ticket], the Ticketing Service shall [generar un código QR que codifica un token firmado server-side que referencia el ticket por un identificador opaco].
2. The Ticketing Service shall [firmar el token de modo que cualquier alteración de su contenido invalide la verificación].
3. The Ticketing Service shall [asignar al token una expiración, de forma que un token expirado sea rechazado en la validación].
4. If [se presenta un token con firma inválida, alterado o expirado], then the Ticketing Service shall [rechazar la validación sin marcar ningún check-in].
5. The Ticketing Service shall [generar el token y el QR del lado servidor, nunca en el cliente].

### Requirement 4: Emisión del ticket en PDF
**Objective:** Como asistente, quiero recibir mi ticket en PDF con el QR, para presentarlo en la entrada.

#### Acceptance Criteria
1. When [se emite un ticket], the Ticketing Service shall [generar un documento PDF que contiene el QR y la información visible del evento y la etapa de boletería].
2. When [se genera el PDF del ticket], the Ticketing Service shall [almacenarlo y poner a disposición del asistente un medio para obtenerlo].
3. While [se procesa el registro], when [la emisión se completa], the Ticketing Service shall [presentar al asistente una pantalla de confirmación con acceso a su ticket].
4. The Ticketing Service shall [generar el PDF del lado servidor, nunca en el cliente].
5. The Ticketing Service shall [no incluir la cédula del asistente en el PDF del ticket].

### Requirement 5: Escaneo y validación en puerta
**Objective:** Como staff de puerta (GATE_STAFF), quiero escanear el QR de un asistente, para validar su ticket antes de permitir el ingreso.

#### Acceptance Criteria
1. While [un usuario con rol GATE_STAFF tiene sesión válida], the Ticketing Service shall [proveer una pantalla de escaneo de QR que envía el token al servidor para su validación].
2. Where [un usuario no tiene el rol GATE_STAFF (ni un rol con permiso de validación)], the Ticketing Service shall [denegar el acceso a la pantalla y al endpoint de validación].
3. When [el servidor recibe un token para validar], the Ticketing Service shall [verificar la firma, la expiración y el estado del ticket en la base de datos antes de decidir].
4. If [el ticket pertenece a una empresa distinta de la del usuario que valida], then the Ticketing Service shall [rechazar la validación sin revelar datos del ticket].
5. The Ticketing Service shall [tomar la decisión de validez exclusivamente del lado servidor, sin confiar en datos provistos por el cliente].

### Requirement 6: Check-in atómico (exactamente un uso)
**Objective:** Como staff de puerta, quiero que un ticket válido se marque como usado una sola vez, para impedir el doble ingreso.

#### Acceptance Criteria
1. When [se valida un ticket auténtico, vigente y aún no usado], the Ticketing Service shall [marcarlo como usado y confirmar el ingreso].
2. If [el ticket ya fue usado], then the Ticketing Service shall [rechazar el ingreso e indicar que el ticket ya fue utilizado, incluyendo cuándo se usó].
3. When [dos validaciones del mismo ticket ocurren de forma concurrente], the Ticketing Service shall [permitir el check-in exitoso de exactamente una y rechazar la otra como ya usada].
4. If [el ticket fue anulado o su evento fue cancelado], then the Ticketing Service shall [rechazar el ingreso e indicar que el ticket no es válido].
5. When [ocurre cualquier intento de validación (exitoso o fallido)], the Ticketing Service shall [registrar el intento para auditoría con su resultado y marca de tiempo].

### Requirement 7: Estados y resultados observables del ticket
**Objective:** Como staff de puerta, quiero un resultado claro de cada escaneo, para actuar en consecuencia de inmediato.

#### Acceptance Criteria
1. When [una validación se resuelve], the Ticketing Service shall [devolver un resultado distinguible entre: válido y admitido, ya usado, no válido (firma/expiración/estado) y no autorizado].
2. When [un check-in es exitoso], the Ticketing Service shall [mostrar al staff la información mínima del asistente necesaria para el ingreso, sin exponer la cédula].
3. The Ticketing Service shall [reconocer un conjunto cerrado de estados del ticket que incluya al menos: emitido/válido, usado y anulado].

### Requirement 8: Restricciones no funcionales
**Objective:** Como operador de la plataforma, quiero garantías mínimas de seguridad y consistencia observables, para proteger la integridad del control de acceso.

#### Acceptance Criteria
1. The Ticketing Service shall [ejecutar la generación del QR, la generación del PDF y la validación/check-in del lado servidor, nunca en componentes del cliente].
2. The Ticketing Service shall [garantizar la atomicidad del check-in, de modo que bajo concurrencia un ticket no pueda usarse más de una vez].
3. If [se recibe una petición de validación o de datos sin la autorización suficiente], then the Ticketing Service shall [responder con una denegación sin filtrar datos sensibles].
4. The Ticketing Service shall [no exponer identificadores internos sensibles ni la cédula en URLs, respuestas públicas o el contenido del QR].

# Requirements Document

## Introduction
Esta especificación define la gestión del catálogo de eventos musicales y sus etapas de boletería (ticket tiers) dentro del SaaS multiempresa. Construye sobre `platform-foundation`, reutilizando su aislamiento multi-tenant, su modelo de roles y la resolución server-side de empresa y rol del usuario. El alcance cubre el CRUD de eventos y de etapas de boletería, su ciclo de vida, y las pantallas administrativas para listarlos, crearlos y configurarlos.

El alcance se limita a comportamientos observables por el usuario administrativo y por el operador de la plataforma. Las decisiones de arquitectura interna, el modelo de datos detallado y la elección de bibliotecas se difieren a la fase de diseño. El stack está fijado como restricción del proyecto, pero los criterios de aceptación se expresan de forma independiente de la tecnología siempre que es posible.

## Boundary Context
- **In scope**: Modelo de eventos (pertenecientes a una empresa) y de etapas de boletería (pertenecientes a un evento); aislamiento multi-tenant de ambos heredando el patrón de la foundation; CRUD de eventos y de tiers resuelto del lado servidor; ciclo de vida del evento (borrador → publicado → finalizado/cancelado); validaciones de entrada; autorización por rol; pantallas de listado de eventos, creación de evento y configuración de boletería.
- **Out of scope**: Registro público de asistentes, emisión de tickets, generación de QR/PDF, Storage y check-in (lo cubre `ticketing-checkin`); inicialización de la app, autenticación, RLS base y RBAC (lo provee `platform-foundation`); pagos, facturación, cobro de boletas, notificaciones y reportería.
- **Adjacent expectations**: Esta especificación asume que la foundation provee de forma confiable la identidad del usuario, su empresa y su rol, y que toda tabla nueva hereda el aislamiento por empresa. `ticketing-checkin` consumirá los eventos publicados y sus tiers (cupo, precio, moneda) como catálogo para el registro público y la emisión de tickets; esta especificación no define ni posee ese flujo público.

## Requirements

### Requirement 1: Aislamiento multi-tenant de eventos y boletería
**Objective:** Como operador de la plataforma, quiero que los eventos y las etapas de boletería de cada empresa queden aislados, para que ninguna empresa vea o modifique el catálogo de otra.

#### Acceptance Criteria
1. When [un usuario autenticado consulta eventos o etapas de boletería], the Event Management Service shall [devolver únicamente los pertenecientes a la empresa de ese usuario].
2. If [un usuario intenta leer, crear, actualizar o eliminar un evento o una etapa de boletería de otra empresa], then the Event Management Service shall [rechazar la operación y no exponer la existencia ni el contenido de ese registro].
3. The Event Management Service shall [aplicar el aislamiento por empresa en eventos y etapas de boletería de forma que no dependa de la lógica del cliente].
4. Where [un usuario tiene el rol SUPER_ADMIN], the Event Management Service shall [permitir el acceso transversal a los eventos y etapas de boletería de todas las empresas].
5. When [se crea un evento], the Event Management Service shall [asociarlo automáticamente a la empresa del usuario autenticado sin permitir asignarlo a otra empresa].
6. The Event Management Service shall [asociar cada etapa de boletería a un evento de la misma empresa, e impedir vincularla a un evento de otra empresa].

### Requirement 2: Autorización por rol para la gestión
**Objective:** Como administrador de empresa, quiero que solo los roles adecuados gestionen eventos y boletería, para mantener separadas las responsabilidades.

#### Acceptance Criteria
1. Where [un usuario tiene el rol COMPANY_ADMIN], the Authorization Module shall [permitir crear, listar, editar y eliminar eventos y etapas de boletería de su empresa].
2. Where [un usuario tiene el rol EVENT_MANAGER], the Authorization Module shall [permitir crear, listar y editar eventos y etapas de boletería de su empresa, y denegar la eliminación de eventos].
3. Where [un usuario tiene el rol GATE_STAFF], the Authorization Module shall [denegar el acceso a las funcionalidades de gestión de eventos y de boletería].
4. The Authorization Module shall [resolver el rol y la empresa del usuario del lado servidor en cada operación de gestión, sin confiar en valores provistos por el cliente].
5. If [un usuario intenta una acción de gestión no permitida para su rol], then the Authorization Module shall [denegar la acción, no producir ningún efecto y no filtrar datos sensibles en el mensaje].

### Requirement 3: Gestión de eventos (CRUD)
**Objective:** Como gestor de eventos, quiero crear y mantener los eventos de mi empresa, para tener el catálogo sobre el cual configurar boletería.

#### Acceptance Criteria
1. When [un usuario autorizado crea un evento con datos válidos], the Event Management Service shall [registrar el evento con nombre, fecha/hora del evento y lugar, en estado inicial de borrador].
2. The Event Management Service shall [requerir como mínimo un nombre no vacío, una fecha/hora del evento y un lugar para crear o actualizar un evento].
3. If [un usuario intenta crear o actualizar un evento con datos faltantes o inválidos], then the Event Management Service shall [rechazar la operación e indicar qué campos son inválidos].
4. When [un usuario autorizado actualiza un evento existente de su empresa], the Event Management Service shall [persistir los cambios y reflejarlos en consultas posteriores].
5. When [un usuario con rol COMPANY_ADMIN elimina un evento de su empresa], the Event Management Service shall [eliminar el evento junto con sus etapas de boletería asociadas].
6. When [un usuario consulta el listado de eventos de su empresa], the Event Management Service shall [devolver cada evento con su nombre, fecha/hora, lugar y estado actual].

### Requirement 4: Ciclo de vida del evento
**Objective:** Como gestor de eventos, quiero controlar el estado de un evento, para decidir cuándo queda disponible para el registro público.

#### Acceptance Criteria
1. The Event Management Service shall [reconocer exactamente cuatro estados de evento: borrador, publicado, finalizado y cancelado].
2. When [un usuario autorizado publica un evento que está en borrador], the Event Management Service shall [cambiar su estado a publicado siempre que tenga al menos una etapa de boletería configurada].
3. If [un usuario intenta publicar un evento sin ninguna etapa de boletería], then the Event Management Service shall [rechazar la publicación e indicar que se requiere al menos una etapa de boletería].
4. When [un usuario autorizado finaliza o cancela un evento], the Event Management Service shall [cambiar su estado a finalizado o cancelado respectivamente].
5. If [un usuario intenta una transición de estado no permitida], then the Event Management Service shall [rechazar la transición y conservar el estado actual].
6. While [un evento está en estado publicado, finalizado o cancelado], the Event Management Service shall [marcarlo como disponible u no disponible para el registro público de modo que solo el estado publicado se considere abierto al registro].

### Requirement 5: Gestión de etapas de boletería (ticket tiers)
**Objective:** Como gestor de eventos, quiero configurar las etapas de boletería de un evento con sus cupos y precios, para definir qué se ofrece al público.

#### Acceptance Criteria
1. When [un usuario autorizado agrega una etapa de boletería a un evento de su empresa con datos válidos], the Event Management Service shall [registrar la etapa con nombre, precio, moneda y cupo asociada a ese evento].
2. The Event Management Service shall [requerir para cada etapa de boletería un nombre no vacío, un precio mayor o igual a cero, una moneda válida y un cupo entero mayor o igual a cero].
3. If [un usuario intenta crear o actualizar una etapa con precio negativo, cupo negativo, moneda inválida o nombre vacío], then the Event Management Service shall [rechazar la operación e indicar el campo inválido].
4. When [un usuario autorizado actualiza o elimina una etapa de boletería de un evento de su empresa], the Event Management Service shall [persistir el cambio y reflejarlo en consultas posteriores].
5. When [un usuario consulta las etapas de boletería de un evento], the Event Management Service shall [devolver cada etapa con su nombre, precio, moneda y cupo].
6. Where [un usuario gestiona etapas de boletería], the Event Management Service shall [permitir configurar múltiples etapas (por ejemplo preventa, general, VIP) para un mismo evento].

### Requirement 6: Pantallas de gestión
**Objective:** Como gestor de eventos, quiero pantallas claras para listar, crear y configurar la boletería de eventos, para administrar el catálogo desde el panel.

#### Acceptance Criteria
1. While [un usuario autorizado navega al panel de eventos], the Event Management UI shall [mostrar el listado de eventos de su empresa con nombre, fecha/hora, lugar y estado].
2. The Event Management UI shall [ofrecer una acción para crear un evento accesible solo a los roles autorizados].
3. When [el usuario envía el formulario de creación o edición con campos vacíos o inválidos], the Event Management UI shall [mostrar mensajes de validación y no enviar la solicitud].
4. While [una operación de guardado está en curso], the Event Management UI shall [mostrar un indicador de progreso y evitar envíos duplicados].
5. When [un usuario autorizado abre la configuración de boletería de un evento], the Event Management UI shall [permitir agregar, editar y eliminar etapas de boletería y reflejar los cambios tras guardarlos].
6. The Event Management UI shall [mostrar únicamente las acciones permitidas para el rol del usuario, ocultando o deshabilitando la eliminación cuando el rol no la permite].

### Requirement 7: Restricciones no funcionales
**Objective:** Como operador de la plataforma, quiero garantías mínimas observables sobre la gestión del catálogo, para proteger la integridad y el aislamiento de los datos.

#### Acceptance Criteria
1. The Event Management Service shall [requerir una sesión autenticada válida para toda operación de gestión de eventos o de boletería].
2. The Event Management Service shall [tomar todas las decisiones de autorización y aislamiento del lado servidor, de modo que manipular el cliente no otorgue acceso adicional].
3. If [se recibe una petición de gestión sin autorización suficiente], then the Event Management Service shall [responder con una denegación sin filtrar datos de otras empresas].
4. The Event Management Service shall [validar los datos de eventos y etapas de boletería del lado servidor con independencia de la validación del cliente].

# Requirements Document

## Introduction
Esta especificación define la fundación técnica y de seguridad de un SaaS multiempresa (multi-tenant) para la gestión de eventos musicales. Establece la base sobre la que se construirán los demás dominios (`event-management` y `ticketing-checkin`): inicialización de la aplicación, autenticación de usuarios, aislamiento estricto de datos entre empresas, control de acceso por roles, y las pantallas mínimas de Login y shell del Dashboard.

El alcance se limita a comportamientos observables por el usuario y por el operador de la plataforma. Las decisiones de arquitectura interna, modelo de datos detallado y elección de bibliotecas se difieren a la fase de diseño. El stack está fijado como restricción del proyecto (Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Supabase Auth/PostgreSQL/Storage), pero los criterios de aceptación se expresan de forma independiente de la tecnología siempre que es posible.

## Boundary Context
- **In scope**: Inicialización de la aplicación; autenticación (inicio y cierre de sesión, persistencia de sesión); modelo de empresas y membresía usuario↔empresa↔rol; aislamiento multi-tenant de datos; control de acceso por roles (SUPER_ADMIN, COMPANY_ADMIN, EVENT_MANAGER, GATE_STAFF) resuelto del lado servidor; pantalla de Login; shell del Dashboard con navegación adaptada al rol.
- **Out of scope**: CRUD de eventos y etapas de boletería (lo cubre `event-management`); registro público de asistentes, tickets, QR, PDF y check-in (lo cubre `ticketing-checkin`); pagos, facturación, notificaciones y reportería.
- **Adjacent expectations**: Las especificaciones aguas abajo dependen de que esta base provea identidad del usuario, su empresa y su rol de forma confiable, y de que toda tabla nueva herede el patrón de aislamiento por empresa definido aquí. Esta base no define entidades de negocio (eventos, tickets); solo garantiza el marco de seguridad y los contratos compartidos que esas entidades reutilizarán.

## Requirements

### Requirement 1: Aislamiento multi-tenant de datos
**Objective:** Como operador de la plataforma, quiero que los datos de cada empresa queden completamente aislados de los de otras empresas, para que ninguna empresa pueda ver o modificar información que no le pertenece.

#### Acceptance Criteria
1. When [un usuario autenticado perteneciente a una empresa solicita registros de datos], the Platform shall [devolver únicamente los registros asociados a la empresa de ese usuario].
2. If [un usuario intenta leer, crear, actualizar o eliminar un registro perteneciente a otra empresa], then the Platform shall [rechazar la operación y no exponer la existencia ni el contenido de ese registro].
3. The Platform shall [aplicar el aislamiento por empresa en todas las tablas que contienen datos pertenecientes a una empresa, de forma que el aislamiento no dependa de la lógica del cliente].
4. Where [un usuario tiene el rol SUPER_ADMIN], the Platform shall [permitir el acceso transversal a los datos de todas las empresas].
5. If [una petición de datos no incluye una identidad de usuario válida], then the Platform shall [rechazar la petición sin devolver datos].

### Requirement 2: Autenticación de usuarios
**Objective:** Como usuario del panel administrativo, quiero iniciar y cerrar sesión de forma segura, para que solo personas autorizadas accedan a la información de la empresa.

#### Acceptance Criteria
1. When [un usuario envía credenciales válidas en la pantalla de inicio de sesión], the Authentication Service shall [establecer una sesión autenticada y redirigir al usuario al Dashboard].
2. If [un usuario envía credenciales inválidas], then the Authentication Service shall [rechazar el acceso y mostrar un mensaje de error sin revelar si el fallo fue por el usuario o por la contraseña].
3. When [un usuario solicita cerrar sesión], the Authentication Service shall [invalidar la sesión activa y redirigir a la pantalla de inicio de sesión].
4. While [un usuario no tiene una sesión válida], when [intenta acceder a una ruta del panel administrativo], the Platform shall [redirigirlo a la pantalla de inicio de sesión].
5. While [una sesión está activa], the Platform shall [mantener al usuario autenticado entre recargas de página hasta que la sesión expire o se cierre].
6. If [una sesión ha expirado], then the Platform shall [tratar al usuario como no autenticado y solicitar un nuevo inicio de sesión].

### Requirement 3: Control de acceso basado en roles (RBAC)
**Objective:** Como administrador de empresa, quiero que cada usuario tenga un rol que determine qué puede hacer, para que las responsabilidades estén separadas y se evite el escalamiento de privilegios.

#### Acceptance Criteria
1. The Platform shall [reconocer exactamente cuatro roles: SUPER_ADMIN, COMPANY_ADMIN, EVENT_MANAGER y GATE_STAFF].
2. The Authorization Module shall [resolver el rol y la empresa del usuario del lado servidor en cada operación protegida, sin confiar en valores provistos por el cliente].
3. If [un usuario intenta ejecutar una acción no permitida para su rol], then the Authorization Module shall [denegar la acción y no producir ningún efecto].
4. When [se evalúa el acceso a una funcionalidad del panel], the Authorization Module shall [conceder acceso únicamente cuando el rol del usuario está autorizado para esa funcionalidad].
5. Where [un usuario tiene el rol SUPER_ADMIN], the Authorization Module shall [permitir acciones administrativas a nivel de plataforma sobre cualquier empresa].
6. The Authorization Module shall [exponer la identidad, empresa y rol del usuario de forma consistente para que las funcionalidades de otras especificaciones reutilicen la misma decisión de autorización].

### Requirement 4: Empresas y membresía de usuarios
**Objective:** Como operador de la plataforma, quiero registrar empresas y asociar usuarios a una empresa con un rol, para que el aislamiento y la autorización tengan una fuente de verdad.

#### Acceptance Criteria
1. The Platform shall [asociar cada usuario no SUPER_ADMIN a exactamente una empresa].
2. The Platform shall [asignar a cada usuario un rol entre los cuatro roles reconocidos].
3. When [se determina la empresa y el rol de un usuario autenticado], the Platform shall [usar esa información como base para el aislamiento de datos y el control de acceso].
4. If [un usuario autenticado no tiene una empresa ni un rol asignados y no es SUPER_ADMIN], then the Platform shall [impedirle el acceso a las funcionalidades del panel y comunicar que su cuenta no está habilitada].

### Requirement 5: Pantalla de inicio de sesión (Login)
**Objective:** Como usuario, quiero una pantalla de inicio de sesión clara, para acceder al panel de mi empresa.

#### Acceptance Criteria
1. The Login Screen shall [presentar campos para credenciales y una acción para iniciar sesión].
2. When [el usuario envía el formulario con campos vacíos o con formato inválido], the Login Screen shall [mostrar mensajes de validación y no enviar la solicitud].
3. While [la solicitud de inicio de sesión está en curso], the Login Screen shall [mostrar un indicador de progreso y evitar envíos duplicados].
4. When [un usuario ya autenticado accede a la pantalla de inicio de sesión], the Platform shall [redirigirlo al Dashboard].

### Requirement 6: Shell del Dashboard y navegación por rol
**Objective:** Como usuario autenticado, quiero un panel con navegación acorde a mi rol, para encontrar solo las funciones que me corresponden.

#### Acceptance Criteria
1. While [un usuario tiene una sesión válida], the Dashboard shall [mostrar un layout autenticado con la identidad del usuario y una acción de cierre de sesión].
2. When [se renderiza la navegación del Dashboard], the Dashboard shall [mostrar únicamente las opciones permitidas para el rol del usuario].
3. If [un usuario intenta acceder directamente a una sección no permitida para su rol mediante su URL], then the Platform shall [denegar el acceso y comunicar que no está autorizado].
4. The Dashboard shall [proveer puntos de extensión de navegación para que las funcionalidades de otras especificaciones se integren sin alterar el control de acceso por rol].

### Requirement 7: Restricciones no funcionales de seguridad
**Objective:** Como operador de la plataforma, quiero garantías mínimas de seguridad observables, para proteger los datos de las empresas frente a accesos indebidos.

#### Acceptance Criteria
1. The Platform shall [requerir una sesión autenticada válida para toda operación que acceda a datos de una empresa].
2. The Platform shall [tomar todas las decisiones de autorización del lado servidor, de modo que manipular el cliente no otorgue acceso adicional].
3. If [se recibe una petición a una operación protegida sin autorización suficiente], then the Platform shall [responder con una denegación y sin filtrar datos sensibles en el mensaje de error].
4. The Platform shall [evitar exponer las credenciales y los identificadores internos sensibles en respuestas, registros visibles al usuario o en la URL].

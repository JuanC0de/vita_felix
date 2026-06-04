# Documento de Requerimientos

## Introducción
Esta especificación define los requerimientos para el rediseño y evolución visual de la plataforma Vita Felix hacia un entorno empresarial SaaS premium. El proyecto incluye la actualización del modelo de datos para admitir memberships multiempresa y la reestructuración visual completa de la aplicación mediante un mini design system consistente y dashboards operativos ajustados al rol del usuario.

## Boundary Context
- **In scope**: Modelo de base de datos multiempresa extendido y tabla pivote `user_companies`; diseño responsivo de dos columnas para inicio de sesión; sidebar administrativo estructurado por secciones y filtrado por rol; dashboards administrativos para SUPER_ADMIN, COMPANY_ADMIN y eventos; módulo mejorado de eventos, boletería y escáner QR en portería con retroalimentación cromática; módulo de asistentes con búsqueda, filtrado y acciones de gestión; y un conjunto de componentes UI reutilizables.
- **Out of scope**: Pasarela de cobros reales para tickets (se mantiene flujo de registro gratuito); procesamiento avanzado de reportes de inteligencia artificial o analítica predictiva; envío real de notificaciones (por ejemplo, pasarela SMS/email externa).
- **Adjacent expectations**: Los módulos actuales de eventos, boletería y escáner deben mantener su lógica de negocio intacta, adaptándose únicamente a las nuevas interfaces del design system y al aislamiento tenant extendido.

## Requirements

### Requirement 1: Base de datos multiempresa extendida
**Objective:** Como operador de la plataforma, quiero extender el esquema de base de datos para almacenar información corporativa de las empresas organizadoras y admitir usuarios vinculados a múltiples empresas, para posibilitar una operación SaaS multi-tenant a escala.

#### Acceptance Criteria
1. The Database shall [almacenar en la tabla `companies` los campos: `legal_name`, `document_number`, `email`, `phone`, `city`, `country` (por defecto 'Colombia'), `logo_url`, `plan` (por defecto 'free'), `status` (por defecto 'active'), `max_events` (por defecto 3), `max_users` (por defecto 3) y `commission_percentage`].
2. The Database shall [proveer la tabla pivote `user_companies` con los campos: `id`, `user_id` (relacionado con auth), `company_id` (FK a companies), `role` (rol del usuario dentro de esa empresa), `status` (por defecto 'active') y `created_at`].
3. The Platform shall [mantener la columna `company_id` en la tabla `events` relacionando cada evento a su respectiva empresa organizadora].
4. The Platform shall [permitir a un usuario estar asociado a múltiples empresas mediante registros en `user_companies`].
5. The Database shall [aplicar seguridad a nivel de fila (RLS) en `user_companies` de forma que los usuarios puedan ver únicamente sus propias asociaciones, los administradores de empresa vean las de su empresa y SUPER_ADMIN tenga acceso completo].

### Requirement 2: Estructura de navegación y Sidebar empresarial por rol
**Objective:** Como usuario de la plataforma, quiero un menú lateral estructurado y adaptado a mi rol activo, para acceder rápidamente a las secciones operativas que me corresponden.

#### Acceptance Criteria
1. When [el usuario autenticado posee el rol SUPER_ADMIN], the Sidebar shall [mostrar las siguientes opciones agrupadas: GENERAL (Dashboard Global, Empresas, Usuarios, Eventos), OPERACIÓN (Boletería, Asistentes, Escáner QR, Check-ins), ANALÍTICA (Reportes, Ventas, Ocupación) y SISTEMA (Roles y permisos, Configuración, Auditoría)].
2. When [el usuario autenticado posee el rol COMPANY_ADMIN], the Sidebar shall [mostrar: MI EMPRESA (Dashboard, Eventos, Usuarios de mi empresa), OPERACIÓN (Boletería, Asistentes, Escáner QR) y ANALÍTICA (Reportes, Ventas)].
3. When [el usuario autenticado posee el rol EVENT_MANAGER], the Sidebar shall [mostrar: EVENTO (Dashboard del evento, Boletería, Asistentes, Check-ins)].
4. When [el usuario autenticado posee el rol GATE_STAFF], the Sidebar shall [mostrar: OPERACIÓN (Escáner QR, Historial de escaneos)].
5. The Sidebar shall [incluir un selector de empresa activa cuando un usuario pertenezca a más de una empresa organizadora].

### Requirement 3: Nueva experiencia de inicio de sesión
**Objective:** Como usuario, quiero una pantalla de inicio de sesión visualmente profesional para acceder al centro de control de forma clara y segura.

#### Acceptance Criteria
1. The Login Layout shall [dividir la pantalla en dos columnas en dispositivos de escritorio (desktop)].
2. The Left Column shall [mostrar un fondo oscuro con degradados, el nombre de la plataforma, una frase comercial descriptiva y métricas estadísticas decorativas de eventos y tickets].
3. The Right Column shall [presentar una tarjeta blanca centrada con el logotipo de la marca, campos de entrada para correo y contraseña con etiquetas limpias, y un botón de acción principal].
4. The Login Screen shall [mostrar indicadores de estado y bloquear envíos duplicados mientras la autenticación se está validando en el servidor].

### Requirement 4: Centro de control global (Dashboard SUPER_ADMIN)
**Objective:** Como administrador global, quiero visualizar métricas y alertas del SaaS completo, para supervisar el rendimiento general del negocio y la infraestructura.

#### Acceptance Criteria
1. The Global Dashboard shall [presentar tarjetas resumen (KPIs) con: empresas activas, empresas suspendidas, eventos totales y ventas estimadas del mes en la plataforma].
2. The Global Dashboard shall [visualizar gráficos de ventas por mes, tickets por estado, eventos por empresa, check-ins por hora y los rankings de los top 5 eventos y empresas con más actividad].
3. The Global Dashboard shall [mostrar una sección de actividad reciente que enumere los últimos eventos creados, empresas registradas, tickets generados y check-ins realizados].
4. The Global Dashboard shall [mostrar una sección de alertas operativas para señalar eventos sin boletería configurada, empresas sin usuarios administradores, eventos sin tickets y tickets duplicados o intentos de validación fallidos].

### Requirement 5: Dashboard de empresa (COMPANY_ADMIN) y Dashboard de evento
**Objective:** Como administrador de empresa o gestor de eventos, quiero ver métricas operativas contextualizadas a mi área de responsabilidad sin interferencia de datos globales.

#### Acceptance Criteria
1. The Company Dashboard shall [exponer las métricas de: eventos activos, tickets vendidos/emitidos, tickets usados, ingresos estimados, porcentaje de ocupación global y el próximo evento programado].
2. The Company Dashboard shall [incluir gráficos de distribución de ventas por evento, asistentes por día, check-ins por hora y ventas por tipo de ticket de la empresa].
3. The Event Dashboard shall [mostrarse bajo la ruta `/admin/events/[id]/dashboard` con métricas de capacidad total, tickets emitidos, tickets disponibles, tickets usados, ingresos estimados y porcentaje de ingreso en puerta].
4. The Event Dashboard shall [proveer accesos de acción rápida para configurar boletería, ver asistentes, abrir escáner, exportar listas y publicar o cerrar el evento].

### Requirement 6: Módulo mejorado de Eventos
**Objective:** Como organizador de eventos, quiero un listado con filtros y tablas detalladas para gestionar el ciclo de vida de los eventos musicales de forma ágil.

#### Acceptance Criteria
1. The Events List page shall [mostrar tarjetas resumen de estados y una barra de búsqueda con filtros por estado del evento, empresa y rango de fechas].
2. The Events List page shall [admitir una vista en formato de tabla profesional y una vista alternativa en formato de tarjetas visuales (cards)].
3. The Events Table shall [incluir las columnas: Evento (con imagen/degradado decorativo), Empresa, Fecha, Lugar, Tickets emitidos, Ocupación, Ingresos estimados, Estado (con badge de color) y un menú de acciones].
4. The Event Actions Menu shall [proveer enlaces específicos para: Dashboard, Boletería, Asistentes, Escáner, Duplicar evento y Cancelar].
5. The Event Status shall [admitir y diferenciar los estados visuales: Borrador, Publicado, En venta, Finalizado, Cancelado y Agotado].

### Requirement 7: Módulo de detalle de evento por pestañas
**Objective:** Como gestor de eventos, quiero ver y editar la información de un evento organizada en pestañas, para no tener múltiples pantallas independientes y simplificar la edición.

#### Acceptance Criteria
1. The Event Detail page shall [estructurarse en pestañas navegables con los nombres: Resumen, Boletería, Asistentes, Check-ins y Configuración].
2. The "Resumen" tab shall [presentar el formulario de edición de datos principales del evento].
3. The "Boletería" tab shall [visualizar las etapas de boletería existentes mediante tarjetas consistentes con el diseño enterprise].
4. The "Asistentes" tab shall [mostrar el listado de asistentes registrados al evento con buscador y filtros].

### Requirement 8: Módulo mejorado de Boletería (Etapas de venta)
**Objective:** Como organizador de eventos, quiero definir y visualizar las etapas de venta de entradas con barras de progreso de cupos, para gestionar los aforos de forma comercial y precisa.

#### Acceptance Criteria
1. The Ticket Tiers view shall [renderizar cada etapa de boletería en una tarjeta dedicada que muestre el nombre de la etapa, precio formateado en pesos colombianos (COP), fechas de inicio y cierre, descripción corta y límite de boletas por persona].
2. Each Ticket Tier card shall [incluir una barra de progreso que indique visualmente el porcentaje de cupo vendido respecto al cupo total disponible].
3. Each Ticket Tier card shall [exhibir un badge visual que distinga el estado de la etapa: Activa, Pausada, Agotada, Programada o Finalizada].
4. The Ticket Tiers view shall [proveer botones para editar la etapa, pausar/activar las ventas y eliminar la etapa si no tiene tickets emitidos].

### Requirement 9: Control de acceso QR operativo (Escáner QR)
**Objective:** Como staff de portería, quiero una pantalla adaptada a dispositivos móviles con cámara visible y alertas visuales grandes, para agilizar la validación de boletas en la entrada del evento.

#### Acceptance Criteria
1. The Scanner page shall [ofrecer un diseño responsivo en modo operativo optimizado para teléfonos móviles, donde el área de la cámara ocupe la mayor parte de la pantalla].
2. The Scanner page shall [incluir un selector destacado para indicar sobre cuál evento se está realizando el control de acceso].
3. When [se valida un ticket exitosamente], the Scanner feedback shall [mostrar una interfaz verde grande que indique 'Entrada válida', el nombre del asistente, el tipo de ticket y la hora de ingreso].
4. When [se valida un ticket que ya fue ingresado previamente], the Scanner feedback shall [mostrar una interfaz amarilla/naranja destacada indicando 'Ticket ya utilizado', el nombre, la hora del primer ingreso y el usuario que lo validó].
5. When [se valida un código QR inexistente o mal formado], the Scanner feedback shall [mostrar una interfaz roja indicando 'Ticket inválido'].
6. When [se valida un ticket perteneciente a otro evento], the Scanner feedback shall [mostrar una interfaz roja indicando 'QR pertenece a otro evento'].
7. The Scanner page shall [mostrar un panel lateral o inferior responsivo que enumere el historial de los últimos 10 escaneos indicando hora, nombre del asistente, tipo de ticket y resultado].

### Requirement 10: Módulo de asistentes de evento
**Objective:** Como gestor de eventos, quiero buscar, filtrar y administrar los asistentes registrados a mi evento, para dar soporte de ingreso y controlar la base de datos de público.

#### Acceptance Criteria
1. The Attendees view shall [ofrecer filtros para clasificar por tipo de ticket (tier), estado de ingreso (admitido o pendiente) y una barra de búsqueda para filtrar por nombre, documento, correo o teléfono].
2. The Attendees Table shall [incluir las columnas: Nombre, Documento (cédula), Correo, Teléfono, Tipo de ticket, Estado del ticket, Check-in (con hora y estado de ingreso), Fecha de registro y menú de acciones].
3. The Attendees actions shall [permitir el reenvío del boleto en PDF por correo, la anulación (cancelación) del ticket y la exportación de la lista en formato CSV].

### Requirement 11: Componentes UI globales (Mini Design System)
**Objective:** Como desarrollador de la plataforma, quiero un catálogo de componentes UI consistente y estructurado, para evitar la duplicidad de estilos Tailwind y agilizar la adición de pantallas en el futuro.

#### Acceptance Criteria
1. The Design System shall [proveer componentes presentacionales y funcionales en `/components/ui/` para: AppButton, AppCard, AppBadge, AppInput, AppSelect, AppTable, AppStatCard, AppPageHeader, AppEmptyState, AppConfirmModal, AppDropdownMenu y AppProgressBar].
2. All components shall [seguir una línea visual común con colores de acento violeta (`#7C3AED`), azul (`#2563EB`) y fondos suaves con bordes redondeados y tipografía `Inter`].
3. All components shall [manejar estados interactivos consistentes (hover, focus, disabled) y mostrar esqueletos de carga (skeleton loaders) durante la obtención de datos].
4. The Platform shall [emplear los componentes UI globales en todas las pantallas administrativas nuevas y modificadas].

### Requirement 12: Reglas responsivas de visualización
**Objective:** Como usuario móvil o administrador de escritorio, quiero que la interfaz se adapte de forma fluida a mi pantalla, para garantizar una correcta operatividad tanto en oficinas como en puerta del evento.

#### Acceptance Criteria
1. The Sidebar shall [convertirse en un menú tipo cajón (drawer) desplegable en pantallas móviles y tablets].
2. The Tables shall [rediseñarse a formatos de tarjetas (cards) individuales apiladas en pantallas de tamaño menor a 768px (móvil)].
3. The main action buttons shall [posicionarse en la parte inferior de la pantalla de forma flotante y pegajosa (sticky) en dispositivos móviles cuando aplique].

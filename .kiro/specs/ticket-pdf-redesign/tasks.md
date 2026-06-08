# Plan de Implementación

## Tareas de Desarrollo

### 1. Cambios en Base de Datos y Tipos
- [ ] 1. Base de datos y Tipos base
- [ ] 1.1 Crear migración de base de datos para agregar `theme_config`
  - Crear el archivo `supabase/migrations/0016_event_theme_config.sql` que añade la columna `theme_config` de tipo `JSONB` a la tabla `public.events` con un valor por defecto `{}`.
  - Ejecutar la migración localmente contra Supabase.
  - _Requisitos: 4.1_
- [ ] 1.2 Actualizar tipos de eventos en TypeScript (P)
  - Modificar [events.ts](file:///Users/juandresbo/_Developer/vita_felix/app/types/events.ts) agregando la interfaz `EventThemeConfig` y el campo `themeConfig?: EventThemeConfig | null` a las interfaces `Event`, `EventCreate`, `EventUpdate` y `EventWriteModel`.
  - Confirmar que compila correctamente la definición de tipos en la aplicación.
  - _Requisitos: 4.1_
  - _Boundary: app/types/events.ts_

### 2. Repositorio de Datos e Integración del Servidor
- [ ] 2. Acceso a Datos e Integración
- [ ] 2.1 Actualizar repositorio de eventos en el servidor (P)
  - Modificar [events-repo.ts](file:///Users/juandresbo/_Developer/vita_felix/server/utils/events-repo.ts) para incluir `theme_config` en la constante `EVENT_COLUMNS`.
  - Adaptar la función `mapEvent` para mapear el campo `theme_config` de la base de datos a `themeConfig` de TypeScript.
  - Actualizar `insertEvent` y `updateEvent` para guardar la propiedad en Supabase.
  - _Requisitos: 4.1_
  - _Boundary: server/utils/events-repo.ts_
  - _Depends: 1.2_
- [ ] 2.2 Modificar flujo de emisión en repositorio de tickets
  - Modificar [tickets-repo.ts](file:///Users/juandresbo/_Developer/vita_felix/server/utils/tickets-repo.ts) en la función `registerAndIssue` para seleccionar el campo `theme_config` del evento.
  - Pasar la propiedad `themeConfig` al llamar a la función `generateTicketPdf`.
  - _Requisitos: 4.1, 4.3_
  - _Boundary: server/utils/tickets-repo.ts_
  - _Depends: 2.1_

### 3. Rediseño del Generador PDF
- [ ] 3. Generación y Renderizado Premium del PDF
- [ ] 3.1 Utilidades auxiliares en el generador de PDF (P)
  - Modificar [ticket-pdf.ts](file:///Users/juandresbo/_Developer/vita_felix/server/utils/ticket-pdf.ts) para extender la interfaz `TicketPdfData` con `themeConfig`.
  - Implementar una función para parsear códigos de color hexadecimales (ej: `#7C3AED`) a objetos RGB compatibles con `pdf-lib` (`{r, g, b}`).
  - Implementar la función de utilidad `getShortCode(ticketId: string): string` que retorna un código corto con formato `VF-XXXXXXX` a partir de los primeros 7 caracteres del UUID en mayúsculas.
  - _Requisitos: 3.3, 4.1, 4.3_
  - _Boundary: server/utils/ticket-pdf.ts_
- [ ] 3.2 Implementar fondo con degradado lineal dinámico
  - Desarrollar la lógica de interpolación lineal para pintar un degradado vertical de fondo en el área del hero superior a partir de `gradientStart` y `gradientEnd` configurados (o por defecto).
  - Validar visualmente el dibujo del degradado de altura 200 px.
  - _Requisitos: 1.2, 4.1, 4.3_
  - _Boundary: server/utils/ticket-pdf.ts_
  - _Depends: 3.1_
- [ ] 3.3 Dibujar flyer adaptativo (object-fit contain) con esquinas redondeadas
  - Implementar la escala proporcional del flyer dentro del espacio de `380x200` y centrarlo.
  - Dibujar una máscara/ruta de clip con esquinas redondeadas o un marco perimetral premium y sombra sutil detrás del flyer.
  - _Requisitos: 1.3, 4.2_
  - _Boundary: server/utils/ticket-pdf.ts_
  - _Depends: 3.1_
- [ ] 3.4 Maquetar la tarjeta del QR y jerarquía visual del ticket
  - Dibujar una tarjeta contenedora de QR de color blanco puro, con bordes redondeados y sombra/borde sutil. Centrar el código QR dentro dejando márgenes de al menos 15 px.
  - Renderizar el badge de boletería usando colores del tema.
  - Escribir el nombre del evento controlando dinámicamente el tamaño de la fuente para evitar desbordamientos.
  - Renderizar la sección de datos del asistente (nombre del asistente y tipo de boleta) con etiquetas claras y alineadas.
  - Escribir el código corto del ticket `VF-XXXXXXX` en la base del ticket de forma secundaria y añadir el footer con branding de Vita Felix o logotipo del evento si existe.
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_
  - _Boundary: server/utils/ticket-pdf.ts_
  - _Depends: 3.2, 3.3_

### 4. Pruebas Unitarias y Verificación
- [ ] 4. Control de Calidad
- [ ] 4.1 Actualizar especificación de pruebas unitarias
  - Modificar [ticket-pdf.spec.ts](file:///Users/juandresbo/_Developer/vita_felix/server/utils/ticket-pdf.spec.ts) agregando casos de prueba para: verificar la obtención correcta del código corto, validar el renderizado del PDF con temas con colores faltantes, y asegurar la resiliencia si fallan las peticiones de logotipos opcionales.
  - Ejecutar la suite con `npx vitest run server/utils/ticket-pdf.spec.ts` y confirmar que pasan todas las pruebas.
  - _Requisitos: 1.1, 3.3, 4.3_
  - _Boundary: server/utils/ticket-pdf.spec.ts_
  - _Depends: 3.4_

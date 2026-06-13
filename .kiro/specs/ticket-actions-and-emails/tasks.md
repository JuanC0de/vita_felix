# Tareas de Desarrollo: Envío de Correos y Acciones de Tickets

Este documento divide los requerimientos y el diseño en tareas manejables de implementación.

## Tarea 1: Utilidad de Envío de Correos en el Servidor
- **Archivo**: `server/utils/email.ts`
- **Descripción**: Crear la función helper `sendEmail` para despachar correos usando la API REST de Resend o mediante SMTP tradicional.
- **Detalle**:
  - Validar presencia de `NUXT_RESEND_API_KEY`. Si existe, hacer una llamada HTTP a `https://api.resend.com/emails` con el payload de correo y archivos adjuntos codificados en base64.
  - Implementar fallback a consola de depuración si no se configuran variables de entorno.

## Tarea 2: Automatización de Envío al Registrar Boletas
- **Archivos**:
  - `server/utils/tickets-repo.ts`
  - `server/utils/event-hosts-repo.ts`
- **Descripción**: Invocar la utilidad de correo electrónico inmediatamente después de que se genera el PDF de la entrada y se sube a Storage.
- **Detalle**:
  - En `registerAndIssue` y `registerGuestInvitation`, capturar el buffer del PDF generado y enviarlo por correo electrónico con un mensaje explicativo y detalles del evento.

## Tarea 3: Modificación del Cálculo de Métricas Analíticas
- **Archivo**: `server/api/events/[id]/dashboard.get.ts`
- **Descripción**: Ajustar las consultas analíticas del panel de control de eventos.
- **Detalle**:
  - Excluir tickets con `status = 'void'` de las métricas de ingresos estimados (`estimatedRevenue`), cantidad de boletas emitidas (`ticketsIssued`), y conteo de ventas por cada tipo de entrada (`salesByTier`).

## Tarea 4: Endpoint de Acción de Reenvío Manual
- **Archivo**: `server/api/tickets/[id]/send-email.post.ts`
- **Descripción**: Crear la ruta administrativa de reenvío.
- **Detalle**:
  - Exigir autorización y validar que el evento pertenezca a la empresa del usuario.
  - Obtener el ticket y su ruta de PDF. Descargar el archivo desde Supabase Storage y despacharlo al correo del asistente.

## Tarea 5: Endpoint de Eliminación Física de Tickets
- **Archivo**: `server/api/tickets/[id]/delete.post.ts`
- **Descripción**: Eliminar permanentemente al asistente y su ticket.
- **Detalle**:
  - Validar rol de administrador.
  - Eliminar los archivos correspondientes en Supabase Storage.
  - Borrar la fila en la tabla `attendees` para eliminar en cascada el ticket asociado.

## Tarea 6: Controles y Modales en el Frontend
- **Archivo**: `app/pages/events/[id]/attendees.vue`
- **Descripción**: Modificar la vista de asistentes para incluir las nuevas acciones.
- **Detalle**:
  - Añadir botón con icono de sobre (✉️) en cada fila de asistente activo para reenviar el correo.
  - Añadir botón "Eliminar" en las filas.
  - Implementar modal de confirmación indicando el impacto destructivo del borrado.

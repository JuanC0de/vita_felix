# Requerimientos: Envío de Correos y Acciones de Tickets

Este documento define los requisitos funcionales para la integración del envío de correos electrónicos automáticos y manuales, la exclusión de tickets anulados de los reportes de ingresos, y la eliminación permanente de tickets y sus respectivos asistentes del sistema.

## Contexto de Límites
- **En alcance**:
  - Creación de un servicio de envío de correos electrónicos con soporte para adjuntar archivos binarios (PDF).
  - Envío automático del ticket PDF al registrar un asistente por el formulario público.
  - Envío automático del ticket PDF al registrar un invitado/cortesía desde el formulario administrativo.
  - Botón en la interfaz administrativa para disparar manualmente el envío del correo electrónico con el ticket a un asistente.
  - Botón en la interfaz administrativa para eliminar permanentemente un asistente y su ticket de la base de datos y de Supabase Storage.
  - Corrección de las consultas del panel de control (dashboard) para que los tickets con estado `void` (anulado) no cuenten en la facturación o etapa de venta.
- **Fuera de alcance**:
  - Personalización de plantillas de correo por cada organizador de eventos.
  - Pasarelas de pago externas.

---

## Requerimientos

### Requisito 1: Integración del Servicio de Correo Electrónico
**Objetivo:** Permitir al sistema despachar correos electrónicos informativos que adjunten los tickets PDF generados para los eventos.

#### Criterios de Aceptación
1. El sistema debe contar con un módulo capaz de conectarse a servidores SMTP convencionales o utilizar la API HTTP de Resend a través de variables de configuración.
2. Si las variables de entorno para correo no están configuradas, el sistema debe operar en modo simulación (fallback), imprimiendo los detalles del correo (asunto, destinatario y ruta del PDF) en los registros de la consola del servidor.
3. El correo enviado debe contener detalles básicos del evento (nombre, fecha, lugar) y el archivo de la boleta en formato PDF adjunto como un flujo binario.

### Requisito 2: Envío Automático al Crear Tickets
**Objetivo:** Asegurar que los asistentes reciban su comprobante e instrucciones de ingreso de forma inmediata tras completar su registro.

#### Criterios de Aceptación
1. Cuando un usuario se registre exitosamente mediante el formulario de boletería pública, el sistema debe disparar automáticamente el correo con su ticket PDF adjunto.
2. Cuando un administrador registre un asistente manualmente (cortesía o venta manual) desde el panel administrativo, el sistema debe enviar el correo correspondiente al destinatario registrado.
3. Cuando un invitado se registre a través de un enlace de invitación de anfitrión, el sistema debe disparar el correo de cortesía con su ticket PDF correspondiente.

### Requisito 3: Reenvío Manual de Tickets por Correo
**Objetivo:** Permitir a los organizadores de eventos reenviar las boletas a los usuarios en caso de problemas con la recepción inicial.

#### Criterios de Aceptación
1. La tabla de asistentes en el panel administrativo debe incluir un botón de acción con icono/diseño representativo de un correo para disparar el reenvío.
2. Al pulsar el botón, se debe enviar una petición `POST` al endpoint `/api/tickets/[id]/send-email` para enviar el correo de forma asíncrona.
3. El endpoint debe validar que el usuario tenga un rol autorizado (`SUPER_ADMIN`, `COMPANY_ADMIN`, `EVENT_MANAGER`) y pertenezca a la misma empresa que organiza el evento.
4. El backend debe descargar el PDF del bucket de Supabase Storage e invocar el servicio de correo para enviarlo al destinatario asociado.

### Requisito 4: Eliminación Permanente de Tickets y Asistentes
**Objetivo:** Permitir a los organizadores remover boletas erróneas o duplicadas del sistema por completo.

#### Criterios de Aceptación
1. El panel de asistentes debe mostrar un botón "Eliminar" accesible para los roles `SUPER_ADMIN` y `COMPANY_ADMIN`.
2. Al pulsar "Eliminar", se debe desplegar un modal de confirmación con advertencia de que la acción es irreversible y liberará el documento de identidad.
3. La acción debe enviar una petición al backend para:
   - Eliminar el archivo del ticket PDF y el comprobante de transferencia (si existe) de Supabase Storage.
   - Eliminar el registro del asistente (`attendees`) de la base de datos, lo cual eliminará en cascada el ticket (`tickets`) y check-ins asociados.

### Requisito 5: Exclusión de Tickets Anulados en Estadísticas de Ingresos
**Objetivo:** Evitar distorsiones en los informes de ventas y dinero recaudado cuando se anulan entradas.

#### Criterios de Aceptación
1. El cálculo de ingresos estimados (`estimatedRevenue`) en el endpoint `/api/events/[id]/dashboard` debe sumar únicamente tickets con estado distinto a `'void'`.
2. El conteo de ventas por etapa (`salesByTier`) debe excluir los tickets con estado `'void'`.
3. El conteo de tickets emitidos activos (`ticketsIssued`) debe excluir los tickets con estado `'void'`.

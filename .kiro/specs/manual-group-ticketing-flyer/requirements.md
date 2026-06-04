# Documento de Requerimientos

## Introducción
Este documento define los requerimientos para expandir las capacidades de boletería de la plataforma Vita Felix mediante tres áreas clave: registro manual de asistentes por parte de administradores (con flujo de copia de mensaje para WhatsApp), soporte de registros múltiples/grupales en el formulario de inscripción pública, e integración de imágenes de flyer en alta definición en la configuración y portal público del evento.

## Límite de Contexto (Boundary Context)
- **En alcance**:
  - Endpoint seguro de administración para emitir tickets manualmente a partir de datos recibidos externamente.
  - Interfaz gráfica en el panel admin para registro manual y copia de texto preparado para WhatsApp.
  - Formulario público dinámico que permite agregar múltiples acompañantes y procesa los registros secuencialmente en lote.
  - Campo `flyer_url` en la base de datos de eventos, con su respectiva validación y entrada en la configuración.
  - Rediseño de la página de registro público a un layout premium de dos columnas que resalta el flyer HD del evento.
- **Fuera de alcance**:
  - Carga directa de imágenes en Supabase Storage (se usará entrada de URL de imagen).
  - Envío automático de mensajes mediante la API de WhatsApp Business (se limita a la copia de texto al portapapeles).

## Requerimientos

### Requerimiento 1: Emisión Manual desde Administrador
**Objetivo:** Como usuario administrativo, quiero registrar manualmente a un asistente en un evento y emitir su ticket, para poder enviarle su entrada por WhatsApp de forma inmediata.

#### Criterios de Aceptación
1. La vista de asistentes de un evento en el administrador debe incluir un botón para "Registrar Asistente".
2. Al hacer clic, se presentará un modal solicitando: Nombre completo, Cédula, Correo electrónico y Etapa de venta (ticket tier) del evento.
3. Al enviar el formulario, el sistema llamará al endpoint administrativo para crear el asistente, emitir el ticket con firma criptográfica, generar el PDF de ingreso y subirlo a Storage de forma inmediata.
4. Al completarse con éxito, el modal mostrará la opción para descargar el PDF y un botón de "Copiar para WhatsApp" que guardará en el portapapeles un mensaje personalizado listo para enviar.
5. Los roles permitidos para esta acción son `SUPER_ADMIN`, `COMPANY_ADMIN` y `EVENT_MANAGER`.

### Requerimiento 2: Registro Público de Múltiples Personas (Registro Grupal)
**Objetivo:** Como visitante del portal público, quiero registrar a varios asistentes a la vez en un solo proceso, para agilizar la obtención de entradas para mi grupo o acompañantes.

#### Criterios de Aceptación
1. El formulario público de registro de evento debe incluir un botón "➕ Añadir acompañante".
2. Al hacer clic, se creará un bloque de campos adicional solicitando Nombre completo, Cédula, Correo y Tipo de boleta. Debe permitirse añadir múltiples acompañantes y eliminarlos individualmente.
3. Al enviar la información, la interfaz cliente ejecutará los registros secuencialmente utilizando el endpoint `POST /api/public/register`.
4. El sistema mostrará una barra de progreso indicando qué entrada se está emitiendo en cada momento.
5. Si un registro individual falla (por ejemplo, por cédula duplicada), se pausará el proceso en lote mostrando de forma clara el error del asistente específico para permitir su corrección sin perder los datos ya completados.
6. Al finalizar con éxito, se listarán todos los asistentes registrados con sus respectivos enlaces de descarga de tickets PDF.

### Requerimiento 3: Imagen de Flyer en Alta Definición
**Objetivo:** Como organizador de eventos, quiero asociar una imagen de flyer al evento y mostrarla en alta definición, para que la interfaz de registro público sea atractiva y llamativa para los usuarios.

#### Criterios de Aceptación
1. La tabla `public.events` debe almacenar el campo `flyer_url` (tipo de datos texto).
2. El formulario de creación y edición general de eventos en el panel de administración debe contener un campo de texto para ingresar la URL del flyer, mostrando una previsualización de la imagen cargada.
3. La página de registro público (`app/pages/e/[eventId]/register.vue`) se reestructurará en escritorio a una cuadrícula de dos columnas:
   - **Columna Izquierda**: Flyer HD del evento a tamaño completo, con un degradado oscuro, mostrando superpuestos el nombre, lugar y fecha del evento.
   - **Columna Derecha**: El formulario interactivo de registro (el cual soporta acompañantes).

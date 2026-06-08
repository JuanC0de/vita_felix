# Documento de Requerimientos

## Introducción
Este documento define los requisitos para el rediseño del ticket PDF generado para el público de Vita Felix, transformándolo en un entregable premium y optimizado para dispositivos móviles.

## Contexto de Límites
- **En alcance**:
  - Estructuración vertical del PDF optimizada para compartir por WhatsApp y visualizar en móviles.
  - Área superior (hero) con fondo de degradado oscuro y soporte para flyer dinámico.
  - Ajuste automático de flyer según proporciones (vertical, horizontal, cuadrado) con bordes redondeados y efecto de brillo/sombra sutil.
  - Tarjeta QR blanca dedicada con sombra ligera y bordes suaves.
  - Reducción del identificador visual a un código corto determinista tipo `VF-XXXXXXX` derivado del UUID.
  - Parametrización completa del diseño mediante un objeto de configuración/tema por evento (colores, logo, flyer, etc.).
- **Fuera de alcance**:
  - Pasarelas de pago y facturación.
  - Modificación del flujo de validación del código QR en el check-in (se conserva la verificación del token firmado).
  - Envío automático de correos con el PDF adjunto.
- **Expectativas adyacentes**:
  - La base de datos debe almacenar las configuraciones de tema correspondientes a cada evento.
  - El generador de QR existente en el servidor debe suministrar el token firmado sin alteraciones.

## Requerimientos

### Requisito 1: Estructura del Documento y Cabecera Hero
**Objetivo:** Como asistente al evento, quiero descargar un ticket con diseño moderno y adaptado a dispositivos móviles, para visualizarlo y compartirlo cómodamente en plataformas de mensajería.

#### Criterios de Aceptación
1. El generador de PDF debe definir un tamaño de página vertical optimizado para pantallas móviles (ancho de 420 px y alto de 720 px).
2. El generador de PDF debe renderizar un hero en la mitad superior de la página empleando un degradado lineal oscuro como fondo.
3. When se proporcione un flyer de evento, el generador de PDF debe renderizarlo centrado en el hero usando escalado proporcional (object-fit: contain), bordes redondeados y un resplandor o sombra difuminada en su parte posterior.
4. When no se proporcione un flyer, el generador de PDF debe dibujar un fondo alternativo oscuro con el nombre y logo de Vita Felix.

### Requisito 2: Jerarquía Visual e Información de Acceso
**Objetivo:** Como validador en puerta, quiero leer de forma rápida los datos básicos de la boleta y del evento, para agilizar el ingreso de los asistentes.

#### Criterios de Aceptación
1. El generador de PDF debe renderizar un badge visual destacado con el nombre de la etapa de boletería (tier) asignada.
2. El generador de PDF debe renderizar el nombre del evento con tamaño tipográfico dinámico decreciente para evitar desbordamiento horizontal si el título es extenso.
3. El generador de PDF debe posicionar el lugar, la fecha y la hora del evento inmediatamente debajo del nombre del evento con tipografía de jerarquía secundaria.
4. El generador de PDF debe incluir una sección detallada con las etiquetas claras para el nombre del asistente y el tipo de boleta.
5. El generador de PDF debe situar un pie de página (footer) de marca corporativa con el logo y branding de la empresa o Vita Felix.

### Requisito 3: Tarjeta de Código QR y Código Corto
**Objetivo:** Como asistente y validador, quiero un código QR legible y un identificador corto y legible, para facilitar su lectura y dictado.

#### Criterios de Aceptación
1. El generador de PDF debe colocar el código QR sobre una tarjeta blanca independiente con bordes redondeados suaves y sombra perimetral ligera.
2. El generador de PDF debe reservar márgenes blancos uniformes de al menos 15 px alrededor de la matriz del código QR.
3. El generador de PDF debe derivar e imprimir en la sección inferior un código corto determinista con formato `VF-XXXXXXX` (donde XXXXXXX son los primeros 7 caracteres en mayúsculas del UUID del ticket) en sustitución del UUID largo completo.
4. The system debe mantener el UUID completo de 36 caracteres dentro del payload firmado del código QR y de los metadatos de persistencia para garantizar la integridad de la validación.

### Requisito 4: Parametrización y Tematización Dinámica
**Objetivo:** Como organizador de eventos, quiero configurar la apariencia de las boletas asociando colores y logotipos propios, para alinear los tickets con la identidad de marca del evento musical.

#### Criterios de Aceptación
1. El generador de PDF debe recibir dinámicamente un objeto de configuración de tema con variables de color principal, color secundario, degradado, URL del logotipo y URL del flyer.
2. El generador de PDF debe procesar flyers horizontales, verticales y cuadrados, ajustando el encuadre dentro de la zona hero sin deformar la imagen ni desbordar sus límites de área asignada.
3. The system debe usar valores de color y branding predeterminados elegantes si las propiedades del tema no están configuradas para el evento.

# Documento de Requisitos: wompi-integration

## Introducción
Esta especificación define los requisitos técnicos y de negocio para integrar la pasarela de pagos Wompi (Colombia) de forma multi-tenant y flexible. La funcionalidad permite a las empresas habilitar el recaudo electrónico directo para sus eventos, sustituyendo el registro secuencial individual por un flujo de compra consolidado por lotes (múltiples entradas y tiers en una sola transacción) y garantizando la entrega automática y segura de boletas únicamente cuando el pago es aprobado mediante webhook.

## Contexto de Límites
- **En Alcance**:
  - Habilitación individual de Wompi en el formulario de creación/edición de empresas con almacenamiento de credenciales seguras.
  - Formulario público de registro multi-ticket que unifica la selección de cantidades y tiers para un evento con Wompi activo.
  - Validación atómica de cupos y registro de transacciones en estado pendiente antes de derivar el flujo a la pasarela.
  - Generación segura de firmas de integridad y procesamiento del Webhook de Wompi.
  - Emisión de asistentes, tickets válidos con código QR y envío automático de correos tras la aprobación del pago.
  - Pantalla de confirmación de pago del frontend sincronizada en tiempo real mediante Supabase Realtime.
- **Fuera de Alcance**:
  - Devoluciones y reembolsos de dinero gestionados desde la aplicación.
  - Registro de transacciones fallidas en las tablas principales de asistentes y tickets (solo se guardan en la tabla de transacciones de pago).

---

## Requisitos

### Requisito 1: Habilitación y Configuración de Wompi por Empresa
**Objetivo:** Como administrador de la plataforma, quiero activar Wompi para una empresa específica ingresando sus credenciales de comercio, para que pueda recaudar de forma autónoma.

#### Criterios de Aceptación
1. **Dado** que un administrador crea o edita una empresa, **cuando** activa el switch de "Habilitar Wompi", **entonces** el sistema debe exigir y guardar los campos: `wompi_public_key`, `wompi_integrity_secret` y `wompi_events_secret`.
2. **Dado** que una empresa tiene Wompi desactivado, **cuando** se renderice el formulario de registro de sus eventos, **entonces** el sistema debe continuar ofreciendo únicamente los métodos de registro tradicionales (gratuito, invitaciones o transferencia manual con comprobante) y no debe intentar cargar scripts ni llaves de Wompi.
3. **Dado** que se edita una empresa con Wompi activo, **cuando** se guarden los cambios, **entonces** las credenciales de Wompi deben almacenarse de forma segura y encriptada en la base de datos (o al menos ocultas en la interfaz para roles no administrativos).

---

### Requisito 2: Formulario Público de Selección Múltiple y Registro Consolidado
**Objetivo:** Como comprador de un evento que tiene Wompi activo, quiero seleccionar la cantidad de entradas que deseo de cada etapa de boletería y registrar los datos de todos los asistentes en un solo paso, para simplificar el proceso de compra.

#### Criterios de Aceptación
1. **Dado** que un evento pertenece a una empresa con Wompi activo, **cuando** el usuario accede a la página de registro público del evento `/e/[eventId]/register`, **entonces** el sistema debe mostrar una interfaz de selección de cantidad (selector numérico) por cada etapa de boletería activa y con cupo disponible.
2. **Dado** que el usuario selecciona una o más boletas de uno o más tiers (ej. 2 de preventa y 1 VIP), **cuando** avanza al siguiente paso, **entonces** el formulario debe renderizar de manera dinámica bloques de campos (Nombre completo, Cédula, Correo electrónico) para cada uno de los asistentes correspondientes a los tickets seleccionados.
3. **Dado** que el usuario completa todos los datos de los asistentes y hace clic en "Proceder al Pago", **cuando** el backend recibe el payload, **entonces** el sistema debe verificar de forma atómica en una única transacción que exista el cupo consolidado total para todos los tiers seleccionados en el evento.

---

### Requisito 3: Creación de Transacción y Generación de Firma de Integridad
**Objetivo:** Como sistema, quiero registrar el intento de compra en estado pendiente y generar la firma de integridad de la transacción, para iniciar el proceso de cobro en Wompi de manera segura.

#### Criterios de Aceptación
1. **Dado** que el usuario inicia el pago consolidado, **cuando** el backend valida con éxito los cupos y la información, **entonces** el sistema debe:
   - Crear un registro en la tabla `payment_transactions` en estado `'pending'` que almacene los datos de los asistentes y los tickets seleccionados en formato JSON.
   - Generar un código de referencia único para la orden de pago.
   - Calcular la firma de integridad SHA-256 combinando: `referencia + valor_total_en_centavos + moneda (COP) + secreto_de_integridad_de_la_empresa`.
2. **Dado** que el backend procesa la solicitud, **cuando** retorna la respuesta al frontend, **entonces** debe incluir la firma de integridad, la llave pública de la empresa, el valor total, la moneda, la referencia y los datos necesarios para inicializar el widget de Wompi.
3. **Dado** que el frontend recibe la respuesta, **cuando** se inicializa el checkout, **entonces** debe invocar el Web Tokenizer o Widget oficial de Wompi pasando los parámetros de pago de forma íntegra.

---

### Requisito 4: Webhook de Procesamiento de Pagos Asíncrono
**Objetivo:** Como sistema backend, quiero recibir el estado final de la transacción desde Wompi para emitir los tickets de forma atómica al confirmarse el pago.

#### Criterios de Aceptación
1. **Dado** que el webhook de Wompi (`/api/public/payments/wompi-webhook`) recibe una notificación de transacción de pago, **cuando** se valida el checksum `x-event-checksum` usando el secreto de eventos de la empresa y este no coincide, **entonces** el backend debe rechazar la petición con un error `401 Unauthorized`.
2. **Dado** que la firma del webhook es válida y el estado recibido es `APPROVED`, **cuando** se procesa la orden pendiente, **entonces** el sistema de forma atómica debe:
   - Verificar si la transacción ya fue procesada previamente (evitar reprocesamiento por webhook duplicado).
   - Insertar los registros en la tabla `attendees` descifrando y deduplicando por cédula para el evento.
   - Insertar los registros en la tabla `tickets` en estado `'valid'`.
   - Restar la cantidad correspondiente de los cupos de cada etapa de boletería.
   - Generar los archivos PDF firmados de los tickets y subirlos a Supabase Storage.
   - Enviar correos electrónicos automáticos a cada uno de los asistentes registrados adjuntando sus tickets individuales.
   - Actualizar el estado de la transacción de pago a `'approved'`.
3. **Dado** que la firma es válida pero el estado es `DECLINED`, `VOIDED` o `ERROR`, **cuando** se procesa la orden, **entonces** el sistema debe marcar el estado correspondiente en la tabla `payment_transactions` y liberar cualquier bloqueo temporal de cupo si se implementó.

---

### Requisito 5: Confirmación de Pago en Tiempo Real en el Frontend
**Objetivo:** Como comprador, quiero ver en tiempo real el resultado de mi transacción y poder descargar mis boletas tan pronto finalice el pago en Wompi, sin necesidad de refrescar manualmente.

#### Criterios de Aceptación
1. **Dado** que el usuario finaliza el pago en Wompi y es redirigido a `/e/[eventId]/confirm-payment?reference=[ref]`, **cuando** carga la página, **entonces** el cliente debe suscribirse a los cambios en la fila de `payment_transactions` para esa referencia mediante Supabase Realtime o mediante consultas recurrentes controladas (polling).
2. **Dado** que la transacción cambia a `'approved'` en la base de datos (gracias al webhook), **quedando** los tickets emitidos, **entonces** el frontend debe mostrar un mensaje de éxito prominente, detallar las boletas emitidas y proporcionar botones directos para la descarga de los PDFs de los tickets de inmediato.
3. **Dado** que la transacción cambia a `'declined'` o `'error'`, **cuando** se recibe la actualización, **entonces** el frontend debe mostrar un mensaje informando que el pago no pudo ser procesado y dar la opción de intentar de nuevo con otro método de pago.

---

### Requisito 6: Panel de Soporte y Emisión Manual de Transacciones
**Objetivo:** Como administrador (Super Admin o Company Admin), quiero ver el listado de transacciones de pago online y forzar la emisión de boletas manualmente para transacciones pendientes, para solucionar fallas técnicas del webhook o confirmar pagos manuales validados.

#### Criterios de Aceptación
1. **Dado** que un `SUPER_ADMIN` accede al panel de soporte `/admin/soporte/pagos`, **cuando** el sistema carga los datos, **entonces** debe mostrar las transacciones de pago online de **todos** los eventos y **todas** las empresas de la plataforma, con buscador por referencia, cédula, nombre y filtros por estado.
2. **Dado** que un `COMPANY_ADMIN` o `EVENT_MANAGER` accede al panel de soporte de su empresa, **cuando** el sistema carga los datos, **entonces** debe mostrar **únicamente** las transacciones correspondientes a los eventos de su empresa, aplicando las políticas de RLS correspondientes y denegando el acceso a transacciones de otras empresas.
3. **Dado** que una transacción está en estado `'pending'` o `'error'`, **cuando** el administrador presiona el botón de "Forzar Emisión Manual" tras confirmar que el dinero ingresó a Wompi, **entonces** el backend debe:
   - Procesar la orden de forma atómica (emitiendo los asistentes y tickets, restando cupos y generando PDFs en Storage).
   - Enviar por correo los tickets a los asistentes registrados.
   - Cambiar el estado de la transacción a `'approved'`.
   - Registrar una marca de auditoría o guardar el ID del usuario administrador que realizó la aprobación manual para trazabilidad.
4. **Dado** que una transacción ya tiene el estado `'approved'`, **cuando** el administrador intente forzar la emisión manual nuevamente, **entonces** el sistema debe bloquear la acción e indicar que las boletas ya fueron emitidas previamente.

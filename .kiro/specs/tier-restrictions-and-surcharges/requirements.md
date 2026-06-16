# Documento de Requerimientos

## Introducción
Este documento detalla los requerimientos para restringir las etapas de boletería en el formulario de registro y gestionar los límites de horario de ingreso junto con sus recargos (excedentes) correspondientes.

## Contexto de Límites
- **En alcance**:
  - Filtrado del selector de categorías de entrada mediante el parámetro `tier` en la URL.
  - Bloqueo visual del selector en el cliente cuando el parámetro está presente.
  - Configuración de hora límite de ingreso y monto de recargo por etapa en el panel de administración.
  - Cálculo de recargos durante el check-in y almacenamiento del excedente cobrado en la tabla de check-ins.
  - Alerta visual de cobro en el escáner de portería.
  - Impresión del límite horario en el PDF de la entrada y en el correo de confirmación.
- **Fuera de alcance**:
  - Procesamiento o pasarela de pagos integrados para el cobro del recargo en el escáner.
  - Modificación de las políticas de RLS de Supabase para restringir compras generales desde API si no se usa la URL parametrizada.

## Requerimientos

### 1. Restricción de Etapas de Boletería
**Objetivo:** Como organizador de eventos, quiero que los usuarios que ingresen mediante un enlace específico solo puedan registrarse en la etapa correspondiente, para evitar la selección errónea o malintencionada de otras categorías de mayor valor.

#### Criterios de Aceptación
1. When el usuario accede a la página de registro con el parámetro de consulta `tier` en la URL, el Formulario de Registro shall preseleccionar automáticamente la etapa correspondiente.
2. When el parámetro de consulta `tier` está presente en la URL, el Formulario de Registro shall deshabilitar el selector de etapa para evitar que el usuario elija otra diferente.
3. When el parámetro de consulta `tier` está presente en la URL, el Formulario de Registro shall mostrar únicamente la etapa seleccionada en las opciones disponibles.

### 2. Configuración de Límites y Recargos
**Objetivo:** Como administrador de la plataforma, quiero definir restricciones horarias de acceso y montos de recargo por etapa de boletería, para incentivar el ingreso temprano y cobrar excedentes en portería.

#### Criterios de Aceptación
1. The Formulario de Etapa de Boletería shall permitir la configuración opcional de un límite de tiempo de ingreso (horas y minutos).
2. The Formulario de Etapa de Boletería shall permitir la configuración de un monto de recargo (excedente) mayor o igual a cero.
3. The Sistema de Gestión shall almacenar el límite de ingreso y el recargo asociados a la etapa en la base de datos.

### 3. Validación y Alertas de Recargo en Portería
**Objetivo:** Como personal de puerta (GATE_STAFF), quiero recibir una advertencia visual destacada cuando escanee un ticket cuyo ingreso esté fuera del horario establecido, para cobrar el recargo correspondiente antes de permitir el acceso.

#### Criterios de Aceptación
1. When se escanea un ticket válido, el Sistema de Check-in shall verificar si la hora actual supera la hora límite de ingreso configurada para su etapa.
2. If la hora de check-in supera la hora límite de ingreso, el Sistema de Check-in shall admitir al asistente, calcular el excedente a cobrar y registrar el recargo en la auditoría de ingreso.
3. When el check-in de un ticket determina que se requiere recargo, la Interfaz de Escáner shall desplegar una advertencia en pantalla indicando que se debe cobrar el monto del excedente configurado.
4. When el personal de puerta realiza el check-in tardío, el Sistema de Check-in shall registrar en la auditoría el monto del recargo aplicado para permitir cuadrar cuentas al final del evento.

### 4. Información de Límite en Entradas
**Objetivo:** Como asistente al evento, quiero ver el límite de horario de ingreso en mi entrada para asistir a tiempo y evitar cargos adicionales.

#### Criterios de Aceptación
1. Where la etapa de boletería tiene una hora límite de ingreso configurada, el Sistema de Emisión de Tickets shall imprimir dicha restricción horaria en la información destacada del PDF de la entrada.
2. Where la etapa de boletería tiene una hora límite de ingreso configurada, el Sistema de Emisión de Tickets shall incluir la restricción horaria en el correo de confirmación de registro.

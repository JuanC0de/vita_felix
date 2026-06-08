# Gap Analysis: Lista de Invitaciones y Cortesías

Este documento analiza la brecha entre los requisitos aprobados para la gestión de listas de invitados/cortesías y el estado actual de la base de código del proyecto **Vita Felix**.

## 1. Requirement-to-Asset Map

A continuación se mapean los requisitos definidos con los componentes del sistema, identificando si ya existen (Reuse/Extend) o si deben ser creados (Missing):

| ID Requisito | Descripción | Componente Afectado | Estado | Notas / Restricciones |
|---|---|---|---|---|
| **REQ 1.1** | Creación de anfitriones | `supabase:table:event_hosts` | **[Missing]** | Nueva tabla requerida. |
| **REQ 1.1** | Creación de anfitriones | `server/utils/event-hosts-repo.ts` | **[Missing]** | Repositorio para transacciones de anfitriones. |
| **REQ 1.2** | Generación de enlaces de invitación | `server/api/events/[id]/hosts.post.ts` | **[Missing]** | API para crear anfitrión y generar token. |
| **REQ 1.3** | Monitoreo de invitados por anfitrión | `app/pages/admin/dashboard/` | **[Extend]** | Modificar la UI de administración para incluir los hosts. |
| **REQ 2.1** | Validación del token de invitación | `server/api/public/invite/[token]/status.get.ts` | **[Missing]** | API pública para validar estado de cupos. |
| **REQ 2.2** | Control de cupos del anfitrión | `supabase:function:register_guest` | **[Missing]** | Función de base de datos para transaccionalidad atómica y concurrencia. |
| **REQ 2.3** | Formulario de registro de invitado | `app/pages/events/[event_id]/invite/[token].vue` | **[Missing]** | Nueva ruta para el formulario web de invitado. |
| **REQ 2.4** | Control de duplicados de cédula | `server/utils/tickets-repo.ts` | **[Reuse]** | Reutilizar `hashCedula` y lógica de validación de unicidad. |
| **REQ 2.5** | Cifrado de cédulas | `server/utils/attendee-crypto.ts` | **[Reuse]** | Reutilizar funciones `encryptCedula`. |
| **REQ 3.1** | Creación de boleta de cortesía | `supabase:table:tickets` | **[Extend]** | Soporte para relacionar `host_id` opcional en la tabla `attendees`. |
| **REQ 3.2** | Generación y envío del ticket PDF | `server/utils/ticket-pdf.ts` | **[Reuse]** | Reutilizar generador de PDF e integrador de envío de correo. |

---

## 2. Opciones de Enfoque de Implementación

### Opción A: Enfoque Híbrido (Recomendado)
* **Descripción**: Crear una nueva tabla de base de datos (`event_hosts`) y un repositorio dedicado (`event-hosts-repo.ts`) para la lógica de administración de anfitriones. Extender la tabla existente de `attendees` para añadir la columna de relación `host_id`. Crear un endpoint público independiente en Nuxt para el formulario de registro y validación por token.
* **Trade-offs**:
  * ✅ Mantiene la separación de responsabilidades limpia al crear un modelo independiente para los anfitriones.
  * ✅ Reutiliza las utilidades criptográficas y de generación de PDF probadas de `tickets-repo.ts` y `ticket-pdf.ts` sin modificarlas críticamente.
  * ❌ Incrementa levemente el número de archivos a mantener en el repositorio.

### Opción B: Todo Integrado (Extender al Máximo)
* **Descripción**: Agregar la lógica de anfitriones dentro de los repositorios y controladores de eventos existentes (`events-repo.ts` y `tickets-repo.ts`). Mezclar la lógica de validación y control de cupos dentro de `registerAndIssue` existente.
* **Trade-offs**:
  * ✅ No crea archivos de utilidades adicionales.
  * ❌ Sobrecarga de responsabilidades las funciones críticas de emisión de boletas regulares en `tickets-repo.ts`.
  * ❌ Aumenta la complejidad y riesgo de regresiones en el flujo principal de venta/registro público general.

---

## 3. Esfuerzo y Riesgo Estimado

* **Esfuerzo: M (Medium / 3 a 5 días)**:
  * *Justificación*: Requiere la creación de una nueva tabla de base de datos con políticas de RLS, una función SQL de control de cupos atómica y una nueva página Nuxt para el registro web, reutilizando en su totalidad la lógica de generación de boletas, firmas QR y PDF ya establecidas.
* **Riesgo: Low (Bajo)**:
  * *Justificación*: Al utilizar un flujo de API y páginas web separadas del canal de registro de boletas general, el riesgo de regresiones en la venta abierta al público es mínimo. La concurrencia está protegida por la base de datos (Supabase plpgsql) mediante bloqueos a nivel de registro (`FOR UPDATE`).

---

## 4. Recomendaciones para el Diseño

* **Enfoque sugerido**: Implementar la **Opción A (Enfoque Híbrido)**.
* **Decisiones clave**:
  * Utilizar una función de base de datos (PL/pgSQL) para la transacción de registro del invitado. Esto asegura que el incremento del contador de invitados y el chequeo de límites `max_guests` sea atómico, evitando condiciones de carrera si varios invitados se registran al mismo tiempo en el último cupo.
  * Crear la ruta frontend `/events/[event_id]/invite/[token]` en Nuxt de forma pública (acceso anónimo) pero con validación estricta de token mediante API pública.
* **Investigación adicional**:
  * Validar si es necesario que el anfitrión pueda ver a sus invitados registrados o si basta con el contador del panel de administración del organizador.

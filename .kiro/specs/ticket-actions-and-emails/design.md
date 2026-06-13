# Diseño Técnico: Envío de Correos y Acciones de Tickets

Este documento describe la arquitectura y el diseño técnico propuesto para implementar la integración de correo electrónico, corregir la anulación del conteo en analíticas y permitir la eliminación física de asistentes.

## Arquitectura del Servicio de Correo

El servicio de correo se implementará como un módulo utilitario server-side en `server/utils/email.ts`. Este módulo será stateless y se integrará con las variables de entorno configuradas.

### Modelo de Envío
```mermaid
graph TD
    A[Event Handler / Repo] --> B{¿Credenciales configuradas?}
    B -- Sí (Resend API) --> C[Petición POST a api.resend.com/emails]
    B -- Sí (SMTP) --> D[Envío vía Nodemailer/SMTP]
    B -- No (Desarrollo) --> E[Simulación por consola]
    C --> F[Fin]
    D --> F
    E --> F
```

### Contrato de la Utilidad de Correo
```typescript
interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean>
```

---

## Diseño del Endpoint de Eliminación Permanente

La eliminación física requiere un tratamiento especial para mantener la integridad de la base de datos y evitar archivos huérfanos en Supabase Storage.

### Secuencia de Eliminación
```mermaid
sequenceDiagram
    participant Admin as Cliente Admin (Frontend)
    participant API as server/api/tickets/[id]/delete (Nuxt)
    participant DB as Supabase PostgreSQL
    participant Storage as Supabase Storage

    Admin->>API: POST /api/tickets/[id]/delete
    API->>DB: Obtener metadatos del ticket (pdf_path, transfer_receipt_path, attendee_id)
    API->>Storage: Eliminar archivo pdf_path del bucket 'tickets'
    opt Si existe transfer_receipt_path
        API->>Storage: Eliminar comprobante de transferencia
    end
    API->>DB: Eliminar registro del asistente (attendee_id)
    Note over DB: ON DELETE CASCADE elimina automáticamente el registro en la tabla tickets
    API-->>Admin: { ok: true }
```

---

## Modelo de Datos y Modificaciones en Consultas Analíticas

### Corrección en `dashboard.get.ts`

1. **Ingresos Estimados**:
   - Anterior: Sumaba el precio de todos los tiers de tickets asociados al evento.
   - Nuevo: Excluirá tickets con `status = 'void'`.
   ```sql
   select t.id, tt.price from public.tickets t
   join public.ticket_tiers tt on tt.id = t.tier_id
   where t.event_id = :eventId and t.status != 'void';
   ```

2. **Tickets Emitidos**:
   - Anterior: Cuenta del total de tickets en la base de datos.
   - Nuevo: Excluirá los tickets en estado `'void'`.

3. **Ventas por Etapa**:
   - Anterior: Conteo total agrupado por tier.
   - Nuevo: Excluirá tickets anulados en el conteo agrupado por tier.

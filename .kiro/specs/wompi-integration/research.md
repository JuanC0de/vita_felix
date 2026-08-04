# Documento de Investigación: Integración de Wompi Colombia

## Introducción
Este documento recopila la investigación técnica basada en la documentación oficial de Wompi Colombia para la implementación rápida y segura del Checkout (Widget) y la recepción de eventos por Webhook.

---

## 1. Widget de Wompi (Web Tokenizer)

Wompi proporciona un script de JS que inyecta un iframe/modal seguro de pago. Se puede incrustar usando una etiqueta `<script>` dentro de un formulario HTML o invocando dinámicamente el widget.

### Script de Inicialización
```html
<script
  src="https://checkout.wompi.co/widget.js"
  data-render="button"
  data-public-key="pub_test_Q5YtZ3bV58661623863486"
  data-amount-in-cents="2990000"
  data-reference="referencia_de_prueba_123"
  data-currency="COP"
  data-signature:integrity="hash_de_integridad_generado_en_servidor"
  data-redirect-url="https://misitio.com/confirm-payment"
></script>
```

### Atributos Clave
- **`data-public-key`**: Llave pública del comercio. En nuestro flujo multi-tenant, se lee de las llaves guardadas en la empresa organizadora.
- **`data-amount-in-cents`**: El valor total de la transacción expresado en centavos colombianos. Ejemplo: `$45.000 COP` se debe enviar como `4500000`. Debe ser un entero.
- **`data-reference`**: Identificador único de la transacción generado por nuestro sistema (usaremos el ID o código único de la orden).
- **`data-currency`**: Moneda de cobro, que debe ser `"COP"`.
- **`data-redirect-url`**: URL a la que se redirigirá al usuario tras finalizar el pago en la pasarela. A esta URL, Wompi le añade el query parameter `id` (el ID de transacción de Wompi) una vez completado el flujo.
- **`data-signature:integrity`**: Firma criptográfica obligatoria para transacciones en pesos colombianos. Previene alteraciones en el monto o moneda desde el lado del cliente.

---

## 2. Firma de Integridad (Server-side)

Para generar la firma de integridad que valida la transacción, se debe aplicar el algoritmo **SHA-256** sobre la concatenación de los valores de la transacción y el secreto de integridad provisto por Wompi para el comercio.

### Algoritmo de Concatenación
Los valores deben unirse en una sola cadena en el siguiente orden exacto sin espacios adicionales:
`referencia + monto_en_centavos + moneda + secreto_de_integridad`

### Ejemplo en TypeScript (Node.js/Nitro)
```typescript
import { createHash } from 'crypto';

export function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const rawString = `${reference}${amountInCents}${currency}${integritySecret}`;
  return createHash('sha256').update(rawString).digest('hex');
}
```

---

## 3. Webhooks de Wompi

Wompi envía notificaciones asíncronas vía HTTP POST cuando una transacción cambia de estado a su destino final. Esta URL de webhook se configura en el panel administrativo de Wompi de la empresa (o se expone globalmente y se enruta de forma dinámica por referencia).

### Estructura del Payload del Webhook (Notificación)
```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "184325-1623863486-48192",
      "amount_in_cents": 2990000,
      "reference": "referencia_de_prueba_123",
      "currency": "COP",
      "status": "APPROVED",
      "status_message": null,
      "billing_data": null,
      "shipping_address": null,
      "payment_method_type": "CARD",
      "payment_method": {
        "type": "CARD",
        "extra": {
          "bin": "411111",
          "name": "VISA",
          "brand": "VISA",
          "last_four": "1111",
          "card_type": "CREDIT"
        }
      },
      "created_at": "2026-07-20T18:30:00.000Z",
      "payment_link_id": null
    }
  },
  "sent_at": "2026-07-20T18:30:05.000Z",
  "timestamp": 1784574646,
  "signature": {
    "properties": [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents",
      "timestamp"
    ],
    "checksum": "d2ef5a7a8cfd6f28..."
  }
}
```

### Estados Posibles de Transacción
- **`APPROVED`**: Pago exitoso. El sistema puede proceder a la emisión e impresión virtual del ticket.
- **`DECLINED`**: Pago rechazado por la pasarela (fondos insuficientes, sospecha de fraude, etc.).
- **`VOIDED`**: Transacción anulada.
- **`ERROR`**: Error técnico en el procesamiento del pago.

---

## 4. Validación de Firma del Webhook (Checksum)

Para asegurar que la notificación proviene legítimamente de Wompi y no de un tercero malintencionado, se debe validar el checksum incluido en el objeto `signature`.

### Regla de Validación
1. Extraer los valores correspondientes a las propiedades listadas en `signature.properties` del cuerpo del mensaje en el orden especificado.
2. Concatenar los valores de estas propiedades seguidos del **Secreto de Eventos** de Wompi de la empresa.
3. Calcular el hash SHA-256 y compararlo con `signature.checksum`.

### Ejemplo en TypeScript (Nitro Webhook)
```typescript
import { createHash } from 'crypto';

export function isValidWebhookSignature(
  payload: any,
  eventsSecret: string
): boolean {
  const properties = payload.signature.properties; // ["transaction.id", "transaction.status", "transaction.amount_in_cents", "timestamp"]
  const checksum = payload.signature.checksum;
  
  // Extraer valores del payload dinámicamente
  const values = properties.map((propPath: string) => {
    if (propPath === 'transaction.id') return payload.data.transaction.id;
    if (propPath === 'transaction.status') return payload.data.transaction.status;
    if (propPath === 'transaction.amount_in_cents') return payload.data.transaction.amount_in_cents;
    if (propPath === 'timestamp') return payload.timestamp;
    return '';
  });
  
  const rawString = `${values.join('')}${eventsSecret}`;
  const computedChecksum = createHash('sha256').update(rawString).digest('hex');
  
  return computedChecksum === checksum;
}
```

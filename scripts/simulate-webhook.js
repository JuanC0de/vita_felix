import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const reference = args[0];
const eventsSecret = args[1] || 'mi_secreto_de_eventos_wompi';
// Puerto/host del servidor a golpear. `nuxt dev` usa 3000 por defecto.
const baseUrl = (args[2] || process.env.WEBHOOK_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const status = (process.env.WEBHOOK_STATUS || 'APPROVED').toUpperCase();

if (!reference) {
  console.error('\x1b[31m%s\x1b[0m', 'Error: Debes suministrar la referencia de pago como primer argumento.');
  console.log('Uso: node scripts/simulate-webhook.js <referencia> [secreto_eventos] [base_url]');
  console.log('Ej.: node scripts/simulate-webhook.js VTFX-123 test_events_xxx http://localhost:3999');
  console.log('Estado simulable con WEBHOOK_STATUS=DECLINED|VOIDED|ERROR (por defecto APPROVED).');
  process.exit(1);
}

const wompiTransactionId = `wompi-tx-${Date.now()}`;
const amountInCents = 1500000; // Simula $15.000 COP
const timestamp = Math.floor(Date.now() / 1000);

// Calcular checksum: transaction.id + transaction.status + transaction.amount_in_cents + timestamp + secreto_de_eventos
const rawString = `${wompiTransactionId}${status}${amountInCents}${timestamp}${eventsSecret}`;
const checksum = createHash('sha256').update(rawString).digest('hex');

const payload = {
  event: "transaction.updated",
  data: {
    transaction: {
      id: wompiTransactionId,
      amount_in_cents: amountInCents,
      reference: reference,
      currency: "COP",
      status: status,
      payment_method_type: "CARD",
      payment_method: {
        type: "CARD",
        extra: {
          bin: "411111",
          name: "VISA",
          brand: "VISA",
          last_four: "1111",
          card_type: "CREDIT"
        }
      },
      created_at: new Date().toISOString()
    }
  },
  sent_at: new Date().toISOString(),
  timestamp: timestamp,
  signature: {
    properties: [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents",
      "timestamp"
    ],
    checksum: checksum
  }
};

console.log('\x1b[36m%s\x1b[0m', 'Enviando webhook simulado de Wompi...');
console.log(`- Referencia: ${reference}`);
console.log(`- Secreto de Eventos Utilizado: ${eventsSecret}`);
console.log(`- Checksum Generado: ${checksum}`);
console.log(`- Estado Simulado: ${status}`);
console.log(`- Destino: ${baseUrl}/api/public/payments/wompi-webhook`);

try {
  const res = await fetch(`${baseUrl}/api/public/payments/wompi-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log('\x1b[32m%s\x1b[0m', `Éxito - Webhook procesado (${res.status}):`);
  } else {
    console.log('\x1b[31m%s\x1b[0m', `Fallo - Error de procesamiento (${res.status}):`);
  }
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', 'Error de conexión al enviar el webhook:', err.message);
  process.exitCode = 1;
}

import { defineConfig, devices } from '@playwright/test'

const PORT = 3124

// Credenciales reales de Supabase para los escenarios autenticados (opcionales).
// Si no se proveen, esos tests se omiten automáticamente.
const fakeUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const fakeKey = process.env.SUPABASE_KEY ?? 'fake_anon_key_for_public_pages'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node .output/server/index.mjs',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      NUXT_PUBLIC_SUPABASE_URL: fakeUrl,
      NUXT_PUBLIC_SUPABASE_KEY: fakeKey,
      SUPABASE_URL: fakeUrl,
      SUPABASE_KEY: fakeKey,
      // Secretos de ticketing (server-only). Se propagan si están definidos; el
      // flujo completo de registro/check-in requiere además un Supabase real.
      NUXT_QR_JWT_SECRET: process.env.NUXT_QR_JWT_SECRET ?? 'e2e-qr-secret-not-for-production-1234',
      NUXT_ATTENDEE_ENC_KEY:
        process.env.NUXT_ATTENDEE_ENC_KEY ?? 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=',
      NUXT_QR_GRACE_HOURS: process.env.NUXT_QR_GRACE_HOURS ?? '12',
    },
  },
})

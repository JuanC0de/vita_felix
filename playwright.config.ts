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
    },
  },
})

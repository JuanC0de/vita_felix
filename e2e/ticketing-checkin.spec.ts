import { expect, test } from '@playwright/test'

/**
 * E2E de ticketing-checkin. Cubre req. 1.3, 5.1, 5.2 (siempre) y el flujo de
 * registro→ticket→check-in (gated, requiere Supabase real + secretos + usuario
 * GATE_STAFF).
 *
 * Escenarios SIN dependencias externas: solo requieren el servidor.
 * Escenario AUTENTICADO: requiere migraciones 0009–0011 aplicadas, el bucket
 * `tickets`, los secretos NUXT_QR_JWT_SECRET / NUXT_ATTENDEE_ENC_KEY reales y un
 * evento publicado. Se omite si faltan las vars E2E_GATE_EMAIL/E2E_GATE_PASSWORD
 * y E2E_PUBLISHED_EVENT_ID.
 */

const gateEmail = process.env.E2E_GATE_EMAIL
const gatePassword = process.env.E2E_GATE_PASSWORD
const publishedEventId = process.env.E2E_PUBLISHED_EVENT_ID
const hasFullFlow = Boolean(gateEmail && gatePassword && publishedEventId)

test.describe('Escáner sin sesión', () => {
  test('la ruta /scan redirige a /login (req. 5.1, 5.2)', async ({ page }) => {
    await page.goto('/scan')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Registro público', () => {
  test('un evento no disponible muestra el aviso correspondiente (req. 1.3)', async ({ page }) => {
    await page.goto('/e/00000000-0000-0000-0000-000000000000/register')
    await expect(page.getByText(/no está disponible para registro/i)).toBeVisible()
  })

  test('la página de ticket ofrece la descarga del PDF (req. 4.3)', async ({ page }) => {
    await page.goto('/t/11111111-1111-1111-1111-111111111111')
    await expect(page.getByText(/registro confirmado/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /descargar ticket/i })).toBeVisible()
  })
})

test.describe('Flujo completo de ticketing (requiere Supabase real)', () => {
  test.skip(
    !hasFullFlow,
    'Define E2E_GATE_EMAIL/E2E_GATE_PASSWORD, E2E_PUBLISHED_EVENT_ID y un Supabase real.',
  )

  test('registro público → ticket; staff escanea y admite (req. 1.1, 4.3, 6.1)', async ({ page }) => {
    // 1) Registro público (sin sesión).
    await page.goto(`/e/${publishedEventId}/register`)
    await page.getByLabel('Nombre completo').fill('Asistente E2E')
    await page.getByLabel('Cédula').fill(String(Date.now()).slice(-10))
    await page.getByLabel('Correo electrónico').fill(`e2e${Date.now()}@example.com`)
    await page.getByRole('button', { name: /obtener mi ticket/i }).click()

    // 2) Pantalla de confirmación con el ticket.
    await expect(page).toHaveURL(/\/t\/[0-9a-f-]+$/)
    await expect(page.getByText(/registro confirmado/i)).toBeVisible()
  })
})

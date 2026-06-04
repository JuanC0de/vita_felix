import { expect, test } from '@playwright/test'

/**
 * E2E de gestión de eventos. Cubre req. 3.1, 4.2, 4.3, 5.1, 6.5, 6.6.
 *
 * Escenario SIN sesión: se ejecuta siempre (solo requiere el servidor).
 * Escenarios AUTENTICADOS: requieren un proyecto Supabase con las migraciones
 * 0006–0008 aplicadas, el Custom Access Token Hook activado y un usuario de
 * prueba con rol de gestión. Se omiten si faltan estas vars:
 *   E2E_EMAIL, E2E_PASSWORD  (+ SUPABASE_URL / SUPABASE_KEY reales en el server).
 */

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const hasCreds = Boolean(email && password)

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email!)
  await page.getByLabel('Contraseña').fill(password!)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await expect(page).toHaveURL(/\/$/)
}

test.describe('Eventos sin sesión', () => {
  test('la ruta de eventos redirige a /login (req. 2.4)', async ({ page }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Gestión de eventos (requiere Supabase real)', () => {
  test.skip(!hasCreds, 'Define E2E_EMAIL/E2E_PASSWORD y un Supabase real para ejecutar.')

  test('crear evento, configurar tier y publicar (req. 3.1, 4.2, 5.1)', async ({ page }) => {
    await login(page)
    await page.goto('/events/new')

    const nombre = `Concierto E2E ${Date.now()}`
    await page.getByLabel('Nombre').fill(nombre)
    await page.getByLabel('Lugar').fill('Movistar Arena')
    await page.getByLabel('Fecha y hora').fill('2026-12-01T20:00')
    await page.getByRole('button', { name: /crear evento/i }).click()

    // Redirige al detalle del evento (estado inicial borrador).
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]+$/)
    await expect(page.getByText('Borrador')).toBeVisible()

    // Configurar una etapa de boletería.
    await page.getByRole('link', { name: /configurar boletería/i }).click()
    await page.getByPlaceholder(/preventa/i).fill('General')
    await page.getByRole('button', { name: /agregar etapa/i }).click()
    await expect(page.getByText('General')).toBeVisible()

    // Publicar el evento.
    await page.goBack()
    await page.getByRole('button', { name: /^publicar$/i }).click()
    await expect(page.getByText('Publicado')).toBeVisible()
  })

  test('publicar sin etapas muestra conflicto (req. 4.3)', async ({ page }) => {
    await login(page)
    await page.goto('/events/new')
    await page.getByLabel('Nombre').fill(`Sin tiers ${Date.now()}`)
    await page.getByLabel('Lugar').fill('Lugar X')
    await page.getByLabel('Fecha y hora').fill('2026-12-02T20:00')
    await page.getByRole('button', { name: /crear evento/i }).click()
    await expect(page).toHaveURL(/\/events\/[0-9a-f-]+$/)

    await page.getByRole('button', { name: /^publicar$/i }).click()
    await expect(page.getByText(/al menos una etapa de boletería/i)).toBeVisible()
    await expect(page.getByText('Borrador')).toBeVisible()
  })
})

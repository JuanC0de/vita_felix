import { expect, test } from '@playwright/test'

/**
 * E2E del flujo de acceso. Cubre req. 2.1, 2.4, 5.4, 6.3.
 *
 * Escenarios SIN sesión: se ejecutan siempre (solo requieren el servidor).
 * Escenarios AUTENTICADOS: requieren un proyecto Supabase con el Custom Access
 * Token Hook activado y un usuario de prueba. Se omiten si faltan estas vars:
 *   E2E_EMAIL, E2E_PASSWORD  (+ SUPABASE_URL / SUPABASE_KEY reales en el server).
 */

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
const hasCreds = Boolean(email && password)

test.describe('Acceso sin sesión', () => {
  test('una ruta protegida redirige a /login (req. 2.4)', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('la pantalla de login muestra el formulario (req. 5.1)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Correo')).toBeVisible()
    await expect(page.getByLabel('Contraseña')).toBeVisible()
  })

  test('credenciales inválidas muestran un error genérico (req. 2.2)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill('noexiste@ejemplo.com')
    await page.getByLabel('Contraseña').fill('claveIncorrecta123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible()
  })
})

test.describe('Acceso autenticado (requiere Supabase real)', () => {
  test.skip(!hasCreds, 'Define E2E_EMAIL/E2E_PASSWORD y un Supabase real para ejecutar.')

  test('login exitoso llega al dashboard (req. 2.1)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(email!)
    await page.getByLabel('Contraseña').fill(password!)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: /cerrar sesión/i })).toBeVisible()
  })

  test('usuario con sesión es redirigido fuera de /login (req. 5.4)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo').fill(email!)
    await page.getByLabel('Contraseña').fill(password!)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await page.goto('/login')
    await expect(page).toHaveURL(/\/$/)
  })
})

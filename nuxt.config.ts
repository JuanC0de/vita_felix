import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app/',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components'
  ],

  css: ['~/assets/css/tailwind.css'],

  // Secretos server-only de ticketing (nunca llegan al cliente).
  // Se sobreescriben con NUXT_QR_JWT_SECRET / NUXT_ATTENDEE_ENC_KEY / NUXT_QR_GRACE_HOURS.
  runtimeConfig: {
    qrJwtSecret: '',
    attendeeEncKey: '',
    qrGraceHours: '12',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
  },

  supabase: {
    // Server-side sessions via cookies (PKCE) — default useSsrCookies: true.
    // Required so server routes can read the session with serverSupabaseUser.
    useSsrCookies: true,
    // Route protection (redirect to /login) is implemented later via custom
    // middleware. The module's global redirect is disabled here so the base
    // page renders before the login page and auth middleware exist.
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: [],
    },
  },
})

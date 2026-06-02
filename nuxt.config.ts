import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app/',
  devtools: { enabled: true },

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/css/tailwind.css'],

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

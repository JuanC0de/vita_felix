<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
    <h1 class="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
      {{ appConfig.app.name }}
    </h1>
    <p class="max-w-md text-base text-slate-600">
      Fundación de la plataforma multiempresa para la gestión de eventos musicales.
    </p>
    <span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
      Nuxt 4 + Tailwind CSS + Supabase
    </span>
  </main>
</template>

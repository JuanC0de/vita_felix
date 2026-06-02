<script setup lang="ts">
const appConfig = useAppConfig()
const { authContext, signOut, refreshContext } = useAuth()

// Carga la identidad confiable desde el servidor (SSR + cliente).
await useAsyncData('auth:context', () => refreshContext())

const isDisabled = computed(() => authContext.value?.status === 'disabled')
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <span class="text-lg font-bold tracking-tight">{{ appConfig.app.name }}</span>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <p class="text-sm font-medium">{{ authContext?.email }}</p>
          <p class="text-xs text-slate-500">{{ authContext?.role ?? 'Sin rol' }}</p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          @click="signOut()"
        >
          Cerrar sesión
        </button>
      </div>
    </header>

    <div v-if="isDisabled" class="mx-6 mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Tu cuenta aún no está habilitada. Contacta al administrador de tu empresa.
    </div>

    <div v-else class="flex">
      <aside class="w-56 shrink-0 border-r border-slate-200 bg-white p-4">
        <AppNav />
      </aside>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

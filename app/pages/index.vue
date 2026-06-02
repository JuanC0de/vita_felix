<script setup lang="ts">
const { authContext } = useAuth()
</script>

<template>
  <section class="space-y-2">
    <h1 class="text-2xl font-bold tracking-tight">Panel</h1>
    <p class="text-slate-600">
      Bienvenido{{ authContext?.email ? `, ${authContext.email}` : '' }}.
    </p>
    <p class="text-sm text-slate-500">
      Rol actual: <span class="font-medium">{{ authContext?.role ?? 'Sin rol' }}</span>
    </p>
  </section>
</template>

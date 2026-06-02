<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4">
    <div class="w-full max-w-sm">
      <h1 class="mb-6 text-center text-2xl font-bold tracking-tight text-slate-900">
        {{ appConfig.app.name }}
      </h1>
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <slot />
      </div>
    </div>
  </div>
</template>

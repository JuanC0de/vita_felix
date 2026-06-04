<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
    <header class="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-600 flex items-center justify-center font-black text-white text-xs">
          VF
        </div>
        <span class="text-base font-bold tracking-tight text-slate-900">{{ appConfig.app.name }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span class="text-xs font-semibold text-emerald-600">Portal Seguro</span>
      </div>
    </header>
    <main class="flex-1 w-full mx-auto max-w-7xl px-4 py-8 md:py-12">
      <slot />
    </main>
  </div>
</template>


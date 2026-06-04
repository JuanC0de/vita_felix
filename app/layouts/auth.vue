<script setup lang="ts">
const appConfig = useAppConfig()
const year = new Date().getFullYear()
</script>

<template>
  <div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0614] px-4 py-10 sm:px-6">
    <!-- Fondo atmosférico -->
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.35),transparent_55%),radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(79,70,229,0.2),transparent_50%),radial-gradient(ellipse_50%_40%_at_0%_80%,rgba(168,85,247,0.15),transparent_45%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px] motion-safe:animate-pulse"
      style="animation-duration: 8s"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -right-24 bottom-1/4 h-64 w-64 rounded-full bg-indigo-500/15 blur-[90px] motion-safe:animate-pulse"
      style="animation-duration: 10s"
      aria-hidden="true"
    />
    <!-- Patrón sutil -->
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.04]"
      style="background-image: radial-gradient(circle at 1px 1px, rgb(255 255 255) 1px, transparent 0); background-size: 32px 32px"
      aria-hidden="true"
    />

    <div class="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-8">
      <!-- Marca -->
      <div class="flex flex-col items-center gap-4 text-center">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-black tracking-tight text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/10"
        >
          VF
        </div>
        <div class="space-y-1.5">
          <p class="text-xs font-medium uppercase tracking-[0.2em] text-violet-300/80">
            {{ appConfig.app.name }}
          </p>
          <p class="text-base text-slate-400">
            Boletas, accesos y eventos en un solo lugar.
          </p>
        </div>
      </div>

      <!-- Formulario -->
      <div
        class="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9"
      >
        <slot />
      </div>

      <p class="text-center text-xs text-slate-600">
        © {{ year }} {{ appConfig.app.name }}
      </p>
    </div>
  </div>
</template>

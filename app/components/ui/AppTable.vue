<script setup lang="ts">
// Componente contenedor de tabla flexible con estilos consistentes.
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-600">
        <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <slot name="headers" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <slot />
        </tbody>
      </table>
    </div>
  </div>
</template>

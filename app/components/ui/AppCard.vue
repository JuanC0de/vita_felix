<script setup lang="ts">
interface Props {
  hoverable?: boolean
  noPadding?: boolean
}

withDefaults(defineProps<Props>(), {
  hoverable: false,
  noPadding: false,
})
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-all duration-200"
    :class="[
      hoverable && 'hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300'
    ]"
  >
    <!-- Cabecera de Tarjeta -->
    <div
      v-if="$slots.header"
      class="border-b border-slate-100 px-6 py-4"
    >
      <slot name="header" />
    </div>

    <!-- Cuerpo de Tarjeta -->
    <div :class="[!noPadding && 'px-6 py-5']">
      <slot />
    </div>

    <!-- Pie de Tarjeta -->
    <div
      v-if="$slots.footer"
      class="bg-slate-50 border-t border-slate-100 px-6 py-4"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

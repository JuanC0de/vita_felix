<script setup lang="ts">
const isOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}

function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="relative inline-block text-left">
    <!-- Gatillo (Trigger) -->
    <div class="cursor-pointer" @click="toggle">
      <slot name="trigger">
        <button
          type="button"
          class="flex items-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
        >
          <!-- SVG vertical de tres puntos por defecto -->
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </slot>
    </div>

    <!-- Menú Desplegable -->
    <div
      v-if="isOpen"
      class="absolute right-0 z-30 mt-1 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg focus:outline-none"
      @click="isOpen = false"
    >
      <slot />
    </div>
  </div>
</template>

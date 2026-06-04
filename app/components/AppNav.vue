<script setup lang="ts">
const { visibleNavGroups } = useAuthorization()
</script>

<template>
  <nav class="flex flex-col gap-4">
    <div
      v-for="group in visibleNavGroups"
      :key="group.groupName"
      class="space-y-1"
    >
      <!-- Cabecera de Grupo -->
      <p class="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
        {{ group.groupName }}
      </p>
      
      <!-- Enlaces del Grupo -->
      <div class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
          active-class="bg-slate-800 text-white font-semibold"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

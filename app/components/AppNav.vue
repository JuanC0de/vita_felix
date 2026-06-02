<script setup lang="ts">
const { visibleNav } = useAuthorization()
</script>

<template>
  <nav class="flex flex-col gap-1">
    <NuxtLink
      v-for="item in visibleNav"
      :key="item.to"
      :to="item.to"
      class="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      active-class="bg-slate-900 text-white hover:bg-slate-900"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

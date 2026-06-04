<script setup lang="ts">
interface Props {
  id: string
  activeTab: 'resumen' | 'dashboard' | 'tickets' | 'attendees'
  eventName: string
  eventStatus: string
}

defineProps<Props>()
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      :title="eventName"
      subtitle="Centro de control operativo y configuración del concierto."
      :breadcrumbs="[
        { label: 'Eventos', to: '/events' },
        { label: eventName }
      ]"
    >
      <template #actions>
        <EventsEventStatusBadge :status="eventStatus as any" />
      </template>
    </AppPageHeader>

    <!-- Tab Bar -->
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex space-x-6 overflow-x-auto scrollbar-none">
        <NuxtLink
          :to="`/events/${id}`"
          class="border-b-2 py-3 px-1 text-sm font-bold tracking-tight transition-colors duration-150 whitespace-nowrap"
          :class="[
            activeTab === 'resumen'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
          ]"
        >
          Resumen
        </NuxtLink>
        
        <NuxtLink
          :to="`/events/${id}/dashboard`"
          class="border-b-2 py-3 px-1 text-sm font-bold tracking-tight transition-colors duration-150 whitespace-nowrap"
          :class="[
            activeTab === 'dashboard'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
          ]"
        >
          📊 Dashboard
        </NuxtLink>
        
        <NuxtLink
          :to="`/events/${id}/tickets`"
          class="border-b-2 py-3 px-1 text-sm font-bold tracking-tight transition-colors duration-150 whitespace-nowrap"
          :class="[
            activeTab === 'tickets'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
          ]"
        >
          🎟️ Boletería
        </NuxtLink>
        
        <NuxtLink
          :to="`/events/${id}/attendees`"
          class="border-b-2 py-3 px-1 text-sm font-bold tracking-tight transition-colors duration-150 whitespace-nowrap"
          :class="[
            activeTab === 'attendees'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-600'
          ]"
        >
          👥 Asistentes
        </NuxtLink>
      </nav>
    </div>

    <!-- Contenido de la Pestaña -->
    <div class="pt-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EventHost, EventHostCreate } from '~/types/invitations'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const route = useRoute()
const id = route.params.id as string

const { get } = useEvents()
const tiers = useTicketTiers(id)

// Cargar evento, anfitriones y tiers
const { data: ev } = await useAsyncData(`events:${id}:head`, () => get(id))
const { data: hostItems, refresh } = await useAsyncData(`events:${id}:hosts`, () => 
  $fetch<EventHost[]>(`/api/events/${id}/hosts`)
)
const { data: tierItems } = await useAsyncData(`events:${id}:tiers`, () => tiers.list())

// Formulario de creación
const name = ref('')
const role = ref('PR')
const maxGuests = ref(5)
const tierId = ref('')
const loading = ref(false)
const error = ref('')

const copiedToken = ref<string | null>(null)

const roleOptions = [
  { value: 'DJ', label: 'Artista / DJ' },
  { value: 'PR', label: 'Relacionista Público (PR)' },
  { value: 'PARTNER', label: 'Socio / Patrocinador' },
  { value: 'GUEST', label: 'Invitado de Casa' },
]

const tierOptions = computed(() => {
  const base = [{ value: '', label: 'Cortesía (Por defecto)' }]
  if (!tierItems.value) return base
  return [
    ...base,
    ...tierItems.value.map((t) => ({
      value: t.id,
      label: `${t.name} (${t.quota} aforo)`,
    })),
  ]
})

function getInviteUrl(token: string): string {
  if (import.meta.client) {
    return `${window.location.origin}/events/${id}/invite/${token}`
  }
  return `/events/${id}/invite/${token}`
}

async function copyToClipboard(token: string) {
  const url = getInviteUrl(token)
  try {
    await navigator.clipboard.writeText(url)
    copiedToken.value = token
    setTimeout(() => {
      if (copiedToken.value === token) copiedToken.value = null
    }, 2000)
  } catch (err) {
    // Silencioso ante errores
  }
}

function getTierName(tId: string | null): string {
  if (!tId || !tierItems.value) return 'Cortesía (Por defecto)'
  const t = tierItems.value.find((x) => x.id === tId)
  return t ? t.name : 'Cortesía'
}

async function onSubmit() {
  if (!name.value.trim() || maxGuests.value <= 0) {
    error.value = 'Completa todos los campos requeridos.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const payload: EventHostCreate = {
      name: name.value.trim(),
      role: role.value,
      maxGuests: maxGuests.value,
      tierId: tierId.value || null,
    }
    await $fetch(`/api/events/${id}/hosts`, {
      method: 'POST',
      body: payload,
    })
    
    // Resetear formulario
    name.value = ''
    role.value = 'PR'
    maxGuests.value = 5
    tierId.value = ''

    await refresh()
  } catch (err: any) {
    error.value = err.data?.statusMessage || 'No se pudo registrar el anfitrión.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <EventsEventHeaderShell
    v-if="ev"
    :id="id"
    active-tab="hosts"
    :event-name="ev.name"
    :event-status="ev.status"
  >
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sección izquierda: Listado de anfitriones -->
      <div class="lg:col-span-2 space-y-6">
        <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
          {{ error }}
        </p>

        <AppCard>
          <template #header>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Anfitriones y Listas de Invitados
            </h2>
          </template>

          <p v-if="!hostItems || hostItems.length === 0" class="text-sm text-slate-500 py-6 text-center">
            Aún no has registrado anfitriones para este evento. Agrega DJs o socios para comenzar a recopilar cortesías de forma automática.
          </p>

          <ul v-else class="divide-y divide-slate-100">
            <li v-for="host in hostItems" :key="host.id" class="py-5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-base">{{ host.name }}</span>
                    <AppBadge variant="info">{{ host.role }}</AppBadge>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">
                    Tipo de boleta: <span class="font-medium text-slate-700">{{ getTierName(host.tierId) }}</span>
                  </p>
                </div>

                <!-- Barra de Progreso de Invitados -->
                <div class="w-full sm:w-60 space-y-1">
                  <div class="flex justify-between text-[10px] text-slate-500">
                    <span>Invitados registrados:</span>
                    <span>{{ host.guestsRegisteredCount }} / {{ host.maxGuests }}</span>
                  </div>
                  <AppProgressBar
                    :value="host.guestsRegisteredCount || 0"
                    :max="host.maxGuests"
                    :variant="(host.guestsRegisteredCount || 0) >= host.maxGuests ? 'success' : 'primary'"
                  />
                </div>
              </div>

              <!-- Enlace de invitación y acciones -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
                <div class="truncate text-xs font-mono text-slate-600 select-all pr-2 max-w-md">
                  {{ getInviteUrl(host.token) }}
                </div>
                <AppButton
                  size="sm"
                  :variant="copiedToken === host.token ? 'primary' : 'secondary'"
                  class="shrink-0 self-end sm:self-auto min-w-[110px]"
                  @click="copyToClipboard(host.token)"
                >
                  <span v-if="copiedToken === host.token">✓ ¡Copiado!</span>
                  <span v-else>Copiar Enlace</span>
                </AppButton>
              </div>
            </li>
          </ul>
        </AppCard>
      </div>

      <!-- Sección derecha: Formulario de agregar anfitrión -->
      <div class="space-y-6">
        <AppCard>
          <template #header>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Registrar Nuevo Anfitrión
            </h2>
          </template>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <div>
              <AppInput
                id="name"
                v-model="name"
                label="Nombre del Anfitrión"
                placeholder="ej. DJ Armin, Socio Principal"
                required
                :disabled="loading"
              />
            </div>

            <div>
              <AppSelect
                id="role"
                v-model="role"
                label="Rol / Categoría"
                :options="roleOptions"
                :disabled="loading"
              />
            </div>

            <div>
              <AppInput
                id="maxGuests"
                v-model="maxGuests"
                type="number"
                label="Límite de Invitaciones (Cupos)"
                placeholder="5"
                required
                min="1"
                :disabled="loading"
              />
            </div>

            <div>
              <AppSelect
                id="tierId"
                v-model="tierId"
                label="Categoría de Boleta"
                :options="tierOptions"
                :disabled="loading"
              />
            </div>

            <div class="pt-2">
              <AppButton
                type="submit"
                :loading="loading"
                variant="primary"
                class="w-full justify-center"
              >
                Registrar y Generar Enlace
              </AppButton>
            </div>
          </form>
        </AppCard>
      </div>
    </div>
  </EventsEventHeaderShell>
</template>

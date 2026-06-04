<script setup lang="ts">
import type { TicketTier, TierCreate } from '~/types/events'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const route = useRoute()
const id = route.params.id as string

const { get } = useEvents()
const tiers = useTicketTiers(id)

const { data: ev } = await useAsyncData(`events:${id}:head`, () => get(id))
const { data: items, refresh } = await useAsyncData(`events:${id}:tiers`, () => tiers.list())

// Cargar aforos vendidos desde el dashboard para mostrar barra de progreso real
const { data: dashboard, refresh: refreshDashboard } = await useAsyncData(`events:${id}:dashboard:progress`, () => 
  $fetch<any>(`/api/events/${id}/dashboard`).catch(() => null)
)

const loading = ref(false)
const error = ref('')
const editingId = ref<string | null>(null)

function fmtPrice(t: TicketTier): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: t.currency, maximumFractionDigits: 0 }).format(t.price)
}

function getSoldProgress(tierId: string): { sold: number; quota: number } {
  if (!dashboard.value?.salesByTier) return { sold: 0, quota: 0 }
  const t = dashboard.value.salesByTier.find((x: any) => x.id === tierId)
  return t ? { sold: t.sold, quota: t.quota } : { sold: 0, quota: 0 }
}

async function onCreate(payload: TierCreate) {
  loading.value = true
  error.value = ''
  try {
    await tiers.create(payload)
    await refresh()
    await refreshDashboard()
  } catch {
    error.value = 'No se pudo agregar la etapa de boletería.'
  } finally {
    loading.value = false
  }
}

async function onUpdate(tierId: string, payload: TierCreate) {
  loading.value = true
  error.value = ''
  try {
    await tiers.update(tierId, payload)
    editingId.value = null
    await refresh()
    await refreshDashboard()
  } catch {
    error.value = 'No se pudo actualizar la etapa de boletería.'
  } finally {
    loading.value = false
  }
}

async function onDelete(tierId: string) {
  if (!confirm('¿Eliminar esta etapa de boletería?')) return
  loading.value = true
  error.value = ''
  try {
    await tiers.remove(tierId)
    await refresh()
    await refreshDashboard()
  } catch {
    error.value = 'No se pudo eliminar la etapa de boletería.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <EventsEventHeaderShell
    v-if="ev"
    :id="id"
    active-tab="tickets"
    :event-name="ev.name"
    :event-status="ev.status"
  >
    <div class="max-w-3xl space-y-6">
      <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
        {{ error }}
      </p>

      <AppCard>
        <template #header>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Etapas de boletería configuradas
          </h2>
        </template>

        <p v-if="!items || items.length === 0" class="text-sm text-slate-500 py-4">
          Este evento todavía no tiene etapas de boletería. Agrega preventa, general o VIP para empezar a emitir tickets.
        </p>

        <ul v-else class="divide-y divide-slate-100 mb-6">
          <li v-for="t in items" :key="t.id" class="py-4 space-y-3">
            <div v-if="editingId !== t.id" class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-slate-950 text-base">{{ t.name }}</span>
                  <AppBadge variant="success">Activa</AppBadge>
                </div>
                <p class="text-xs text-slate-500 mt-1">
                  Precio: <span class="font-semibold text-slate-800">{{ fmtPrice(t) }}</span> · Cupo: {{ t.quota }}
                </p>
              </div>

              <!-- Barra de Progreso de Aforo -->
              <div class="w-full sm:w-64 space-y-1">
                <div class="flex justify-between text-[10px] text-slate-500">
                  <span>Aforo vendido:</span>
                  <span>{{ getSoldProgress(t.id).sold }} / {{ t.quota }}</span>
                </div>
                <AppProgressBar :value="getSoldProgress(t.id).sold" :max="t.quota" variant="primary" />
              </div>

              <div class="flex items-center gap-3 self-end sm:self-auto">
                <AppButton variant="ghost" size="sm" @click="editingId = t.id">
                  Editar
                </AppButton>
                <AppButton variant="outline" size="sm" class="text-rose-600 border-rose-250 hover:bg-rose-50" :disabled="loading" @click="onDelete(t.id)">
                  Eliminar
                </AppButton>
              </div>
            </div>
            
            <!-- Formulario de Edición -->
            <div v-else class="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <EventsTicketTierForm
                :initial="{ name: t.name, price: t.price, currency: t.currency, quota: t.quota }"
                :loading="loading"
                submit-label="Guardar cambios de la etapa"
                @submit="(p) => onUpdate(t.id, p)"
              />
              <div class="flex justify-end pt-1">
                <AppButton variant="ghost" size="sm" @click="editingId = null">
                  Cancelar edición
                </AppButton>
              </div>
            </div>
          </li>
        </ul>

        <!-- Formulario para agregar una nueva etapa -->
        <div class="border-t border-slate-100 pt-6">
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Agregar nueva etapa de venta
          </h3>
          <EventsTicketTierForm :loading="loading" @submit="onCreate" />
        </div>
      </AppCard>
    </div>
  </EventsEventHeaderShell>
</template>

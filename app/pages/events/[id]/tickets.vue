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

const copied = ref(false)
const copiedTierId = ref<string | null>(null)

function getRegisterUrl(): string {
  if (import.meta.client) {
    return `${window.location.origin}/e/${id}/register`
  }
  return `/e/${id}/register`
}

async function copyRegisterUrl() {
  const url = getRegisterUrl()
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    // Silencioso ante errores
  }
}

function getTierRegisterUrl(tierId: string): string {
  if (import.meta.client) {
    return `${window.location.origin}/e/${id}/register?tier=${tierId}`
  }
  return `/e/${id}/register?tier=${tierId}`
}

async function copyTierLink(tierId: string) {
  const url = getTierRegisterUrl(tierId)
  try {
    await navigator.clipboard.writeText(url)
    copiedTierId.value = tierId
    setTimeout(() => {
      if (copiedTierId.value === tierId) copiedTierId.value = null
    }, 2000)
  } catch (err) {
    // Silencioso ante errores
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

      <!-- Enlace Público de Venta -->
      <AppCard>
        <template #header>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Enlace de venta público
          </h2>
        </template>

        <div class="space-y-3">
          <p class="text-xs text-slate-500">
            Comparte este enlace con tu público para que puedan registrarse y adquirir sus entradas al evento de forma directa.
          </p>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
            <div class="truncate text-xs font-mono text-slate-600 select-all pr-2 max-w-md">
              {{ getRegisterUrl() }}
            </div>
            <AppButton
              size="sm"
              :variant="copied ? 'primary' : 'secondary'"
              class="shrink-0 self-end sm:self-auto min-w-[110px]"
              @click="copyRegisterUrl"
            >
              <span v-if="copied">✓ ¡Copiado!</span>
              <span v-else>Copiar Enlace</span>
            </AppButton>
          </div>
        </div>
      </AppCard>

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
                <p v-if="t.entryTimeLimit" class="text-[10px] text-amber-600 font-semibold mt-1">
                  🕒 Límite de ingreso: hasta las {{ t.entryTimeLimit }} · Recargo: {{ new Intl.NumberFormat('es-CO', { style: 'currency', currency: t.currency, maximumFractionDigits: 0 }).format(t.surchargeAmount ?? 0) }}
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

              <div class="flex items-center gap-2 self-end sm:self-auto">
                <AppButton
                  size="sm"
                  :variant="copiedTierId === t.id ? 'primary' : 'secondary'"
                  class="shrink-0 min-w-[95px]"
                  @click="copyTierLink(t.id)"
                >
                  <span v-if="copiedTierId === t.id">✓ Copiado</span>
                  <span v-else>🔗 Enlace</span>
                </AppButton>
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
                :initial="{ name: t.name, price: t.price, currency: t.currency, quota: t.quota, entryTimeLimit: t.entryTimeLimit, surchargeAmount: t.surchargeAmount }"
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

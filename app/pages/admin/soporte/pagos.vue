<script setup lang="ts">
import type { PaymentTransaction } from '~/types/ticketing'

definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] })

const search = ref('')
const statusFilter = ref('')
const limit = ref(10)
const offset = ref(0)

const { data: resData, error, pending, refresh } = await useFetch<any>('/api/admin/payments/transactions', {
  query: computed(() => ({
    search: search.value.trim(),
    status: statusFilter.value,
    limit: limit.value,
    offset: offset.value,
  })),
  watch: [search, statusFilter, offset],
})

// Variables para el modal de visualización de asistentes
const showDetailsModal = ref(false)
const selectedTransaction = ref<PaymentTransaction | null>(null)

function viewAttendees(tx: PaymentTransaction) {
  selectedTransaction.value = tx
  showDetailsModal.value = true
}

// Variables para el modal de forzar emisión manual
const showForceModal = ref(false)
const transactionToForce = ref<PaymentTransaction | null>(null)
const auditNote = ref('')
const forceLoading = ref(false)
const forceError = ref('')

function openForceModal(tx: PaymentTransaction) {
  transactionToForce.value = tx
  auditNote.value = ''
  forceError.value = ''
  showForceModal.value = true
}

async function handleForceIssue() {
  if (!transactionToForce.value || !auditNote.value.trim()) return

  forceLoading.value = true
  forceError.value = ''

  try {
    await $fetch('/api/admin/payments/force-issue', {
      method: 'POST',
      body: {
        transactionId: transactionToForce.value.id,
        auditNote: auditNote.value.trim(),
      },
    })
    showForceModal.value = false
    transactionToForce.value = null
    auditNote.value = ''
    refresh()
  } catch (err: any) {
    forceError.value = err.data?.message || 'No se pudo forzar la emisión de las boletas.'
  } finally {
    forceLoading.value = false
  }
}

// Helpers visuales
function getBadgeType(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'declined' || status === 'voided') return 'danger'
  return 'neutral'
}

function getBadgeLabel(status: string) {
  if (status === 'approved') return 'Aprobado'
  if (status === 'pending') return 'Pendiente'
  if (status === 'declined') return 'Declinado'
  if (status === 'voided') return 'Anulado'
  if (status === 'error') return 'Error'
  return status
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
}

const totalPages = computed(() => {
  const total = resData.value?.total ?? 0
  return Math.ceil(total / limit.value)
})

const currentPage = computed(() => {
  return Math.floor(offset.value / limit.value) + 1
})

function prevPage() {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value)
  }
}

function nextPage() {
  const total = resData.value?.total ?? 0
  if (offset.value + limit.value < total) {
    offset.value += limit.value
  }
}

// Resetear paginación al filtrar o buscar
watch([search, statusFilter], () => {
  offset.value = 0
})
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Soporte y Auditoría de Pagos"
      subtitle="Monitorea las transacciones online de Wompi y fuerza la emisión manual en caso de desconexión del webhook."
    />

    <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
      No se pudieron cargar las transacciones. Por favor, reintenta.
    </p>

    <!-- Filtros de búsqueda -->
    <AppCard>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AppInput
          v-model="search"
          label="Buscador"
          placeholder="Referencia, nombre, email o cédula..."
        />
        
        <AppSelect
          v-model="statusFilter"
          label="Estado del pago"
          :options="[
            { value: '', label: 'Todos los estados' },
            { value: 'pending', label: 'Pendiente (Pending)' },
            { value: 'approved', label: 'Aprobado (Approved)' },
            { value: 'declined', label: 'Declinado (Declined)' },
            { value: 'error', label: 'Error' }
          ]"
        />
      </div>
    </AppCard>

    <!-- Listado de Transacciones -->
    <AppCard class="overflow-x-auto">
      <div v-if="pending" class="py-12 flex justify-center items-center">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>

      <div v-else-if="!resData?.transactions?.length" class="py-12 text-center text-slate-500 font-medium">
        No se encontraron transacciones de pago online.
      </div>

      <table v-else class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider bg-slate-50/50">
            <th class="p-4">Fecha</th>
            <th class="p-4">Referencia / Wompi ID</th>
            <th class="p-4">Evento / Empresa</th>
            <th class="p-4">Comprador</th>
            <th class="p-4 text-right">Monto</th>
            <th class="p-4">Estado</th>
            <th class="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
          <tr v-for="tx in resData.transactions" :key="tx.id" class="hover:bg-slate-50/50">
            <td class="p-4 whitespace-nowrap text-xs text-slate-500">
              {{ formatDate(tx.createdAt) }}
            </td>
            <td class="p-4">
              <div class="font-bold text-slate-800 text-xs">{{ tx.reference }}</div>
              <div class="text-[10px] text-slate-400 font-semibold mt-0.5">{{ tx.wompiId || 'Sin ID Wompi' }}</div>
            </td>
            <td class="p-4 max-w-[200px] truncate">
              <div class="font-bold text-slate-800">{{ tx.eventName }}</div>
              <div class="text-xs text-slate-400 font-semibold">{{ tx.companyName }}</div>
            </td>
            <td class="p-4">
              <div class="font-bold text-slate-800">{{ tx.attendeesData[0]?.fullName || 'Asistente' }}</div>
              <div class="text-xs text-slate-500 font-semibold">
                {{ tx.attendeesData[0]?.email }}
                <span class="text-indigo-600 font-bold ml-1">({{ tx.attendeesData.length }} boletas)</span>
              </div>
            </td>
            <td class="p-4 text-right font-extrabold text-slate-800">
              ${{ (tx.amountInCents / 100).toLocaleString('es-CO') }} {{ tx.currency }}
            </td>
            <td class="p-4">
              <AppBadge :variant="getBadgeType(tx.status)">
                {{ getBadgeLabel(tx.status) }}
              </AppBadge>
            </td>
            <td class="p-4">
              <div class="flex items-center justify-center gap-2">
                <AppButton variant="outline" size="sm" @click="viewAttendees(tx)">
                  Ver Asistentes
                </AppButton>
                <AppButton
                  v-if="tx.status === 'pending' || tx.status === 'error'"
                  variant="primary"
                  size="sm"
                  class="bg-emerald-600 hover:bg-emerald-700 border-none"
                  @click="openForceModal(tx)"
                >
                  Forzar Emisión
                </AppButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div v-if="resData?.total > limit" class="flex items-center justify-between border-t border-slate-100 p-4">
        <span class="text-xs text-slate-500 font-semibold">
          Página {{ currentPage }} de {{ totalPages }} ({{ resData.total }} transacciones en total)
        </span>
        <div class="flex items-center gap-2">
          <AppButton variant="outline" size="sm" :disabled="offset === 0" @click="prevPage">
            Anterior
          </AppButton>
          <AppButton variant="outline" size="sm" :disabled="offset + limit >= resData.total" @click="nextPage">
            Siguiente
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Modal 1: Detalle de Asistentes -->
    <div v-if="showDetailsModal && selectedTransaction" class="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-3xl max-w-xl w-full border border-slate-100 shadow-2xl p-6 space-y-6">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="text-base font-bold text-slate-800">Asistentes Registrados en la Transacción</h3>
          <button class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer" @click="showDetailsModal = false">×</button>
        </div>

        <div class="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          <div
            v-for="(att, i) in selectedTransaction.attendeesData"
            :key="i"
            class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center"
          >
            <div>
              <p class="text-sm font-bold text-slate-800">{{ att.fullName }}</p>
              <p class="text-xs text-slate-500 font-semibold">Correo: {{ att.email }} | Cédula: {{ att.cedula }}</p>
            </div>
            <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-extrabold uppercase">
              ID Tier: {{ att.tierId.substring(0, 8) }}
            </span>
          </div>
        </div>

        <!-- Campos de Auditoría si fue aprobada manualmente -->
        <div v-if="selectedTransaction.auditedBy" class="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-1">
          <span class="text-xs font-bold text-amber-800 block">⚠️ Transacción Emitida por Soporte</span>
          <p class="text-xs text-slate-700 font-medium"><strong>Nota:</strong> {{ selectedTransaction.auditNote }}</p>
          <p class="text-[10px] text-slate-400 font-semibold">Auditado el: {{ formatDate(selectedTransaction.auditedAt || '') }}</p>
        </div>

        <div class="text-right pt-2">
          <AppButton variant="outline" size="sm" @click="showDetailsModal = false">Cerrar</AppButton>
        </div>
      </div>
    </div>

    <!-- Modal 2: Forzar Emisión Manual -->
    <div v-if="showForceModal && transactionToForce" class="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <form class="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-5" @submit.prevent="handleForceIssue">
        <div class="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 class="text-base font-bold text-slate-800">Confirmar Emisión Manual</h3>
          <button class="text-slate-400 hover:text-slate-600 text-lg cursor-pointer" type="button" @click="showForceModal = false">×</button>
        </div>

        <p class="text-xs text-slate-500 leading-relaxed">
          Estás a punto de forzar la emisión manual de las boletas para la referencia <strong class="text-slate-700">{{ transactionToForce.reference }}</strong>. 
          Realiza esto únicamente si has verificado previamente que el dinero ingresó de forma satisfactoria a Wompi.
        </p>

        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700">Justificación del Soporte (Obligatorio)</label>
          <textarea
            v-model="auditNote"
            required
            rows="3"
            class="w-full rounded-xl border border-slate-300 p-3 text-xs focus:border-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
            placeholder="Ej: Pago confirmado manualmente en la consola de Wompi."
          ></textarea>
        </div>

        <p v-if="forceError" class="rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold p-3 border border-rose-100">
          {{ forceError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <AppButton variant="outline" size="sm" type="button" :disabled="forceLoading" @click="showForceModal = false">
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            type="submit"
            :loading="forceLoading"
            class="bg-emerald-600 hover:bg-emerald-700 border-none"
          >
            Emitir Boletas
          </AppButton>
        </div>
      </form>
    </div>
  </div>
</template>

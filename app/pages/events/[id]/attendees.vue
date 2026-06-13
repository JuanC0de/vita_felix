<script setup lang="ts">
definePageMeta({ requiredRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'EVENT_MANAGER'] })

const route = useRoute()
const id = route.params.id as string

const { get: getEvent } = useEvents()

const { data: ev } = await useAsyncData(`events:${id}:head:attendees`, () => getEvent(id))
const { data: attendees, pending, error, refresh } = await useAsyncData(`events:${id}:attendees`, () => 
  $fetch<any[]>(`/api/events/${id}/attendees`)
)

const search = ref('')
const tierFilter = ref('')
const checkinFilter = ref('')

const filteredAttendees = computed(() => {
  if (!attendees.value) return []
  return attendees.value.filter((att) => {
    const matchesSearch = att.fullName.toLowerCase().includes(search.value.toLowerCase()) || 
                          att.email.toLowerCase().includes(search.value.toLowerCase()) ||
                          att.cedula.includes(search.value)
    
    const matchesTier = !tierFilter.value || att.ticket?.tierName === tierFilter.value
    
    let matchesCheckin = true
    if (checkinFilter.value === 'yes') {
      matchesCheckin = att.ticket?.status === 'used'
    } else if (checkinFilter.value === 'no') {
      matchesCheckin = att.ticket?.status === 'valid'
    } else if (checkinFilter.value === 'void') {
      matchesCheckin = att.ticket?.status === 'void'
    }

    return matchesSearch && matchesTier && matchesCheckin
  })
})

const uniqueTiers = computed(() => {
  if (!attendees.value) return []
  const set = new Set((attendees.value).map((a: any) => a.ticket?.tierName).filter(Boolean))
  return Array.from(set).map(name => ({ value: name, label: name }))
})

// Variables para anular ticket
const showConfirmVoid = ref(false)
const selectedTicketId = ref('')
const selectedAttendeeName = ref('')
const voidLoading = ref(false)

function openVoidModal(att: any) {
  if (!att.ticket?.id) return
  selectedTicketId.value = att.ticket.id
  selectedAttendeeName.value = att.fullName
  showConfirmVoid.value = true
}

async function onConfirmVoid() {
  voidLoading.value = true
  try {
    await $fetch(`/api/tickets/${selectedTicketId.value}/void`, { method: 'POST' })
    showConfirmVoid.value = false
    await refresh()
  } catch (err) {
    alert('No se pudo anular el ticket.')
  } finally {
    voidLoading.value = false
  }
}

// Variables para reenvío manual de correo
const emailLoading = ref(false)
const sendingEmailTicketId = ref('')

async function onSendEmail(ticketId: string) {
  sendingEmailTicketId.value = ticketId
  emailLoading.value = true
  try {
    await $fetch(`/api/tickets/${ticketId}/send-email`, { method: 'POST' })
    alert('El ticket ha sido reenviado por correo electrónico exitosamente.')
  } catch (err: any) {
    alert(err.data?.statusMessage || 'No se pudo enviar el correo del ticket.')
  } finally {
    emailLoading.value = false
    sendingEmailTicketId.value = ''
  }
}

// Variables para eliminación permanente de ticket
const showConfirmDelete = ref(false)
const deleteLoading = ref(false)

function openDeleteModal(att: any) {
  if (!att.ticket?.id) return
  selectedTicketId.value = att.ticket.id
  selectedAttendeeName.value = att.fullName
  showConfirmDelete.value = true
}

async function onConfirmDelete() {
  deleteLoading.value = true
  try {
    await $fetch(`/api/tickets/${selectedTicketId.value}/delete`, { method: 'POST' })
    showConfirmDelete.value = false
    await refresh()
  } catch (err: any) {
    alert(err.data?.statusMessage || 'No se pudo eliminar el asistente y su ticket.')
  } finally {
    deleteLoading.value = false
  }
}

// Variables para envío masivo de correos
const showConfirmBulkEmail = ref(false)
const bulkEmailLoading = ref(false)

function openBulkEmailModal() {
  showConfirmBulkEmail.value = true
}

async function onConfirmBulkEmail() {
  bulkEmailLoading.value = true
  try {
    const res = await $fetch<any>(`/api/events/${id}/send-emails`, { method: 'POST' })
    showConfirmBulkEmail.value = false
    alert(`Se enviaron exitosamente ${res.count} correos. Fallidos: ${res.failed}.`)
  } catch (err: any) {
    alert(err.data?.statusMessage || 'No se pudo realizar el envío masivo de correos.')
  } finally {
    bulkEmailLoading.value = false
  }
}

// Obtener URL del PDF
function openPdf(ticketId: string) {
  window.open(`/api/tickets/${ticketId}/pdf`, '_blank')
}

// Exportar CSV
function exportCSV() {
  const list = filteredAttendees.value ?? []
  if (list.length === 0) return
  
  const headers = ['Nombre', 'Documento', 'Correo', 'Tipo de Ticket', 'Estado Ticket', 'Check-in', 'Fecha Registro']
  const rows = list.map(a => [
    a.fullName,
    a.cedula,
    a.email,
    a.ticket?.tierName || 'Sin asignar',
    a.ticket?.status || 'N/A',
    a.ticket?.status === 'used' ? 'Ingresó' : 'Pendiente',
    new Date(a.createdAt).toLocaleString('es-CO')
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `asistentes_${ev.value?.name || 'evento'}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Variables para registro manual de asistente
const showManualModal = ref(false)
const manualFullName = ref('')
const manualCedula = ref('')
const manualEmail = ref('')
const manualTierId = ref('')
const manualLoading = ref(false)
const manualErrors = ref<Record<string, string>>({})
const manualSuccessTicketId = ref('')
const manualSuccessPdfUrl = ref('')
const manualHasReceipt = ref(false)
const manualReceiptFile = ref<File | null>(null)

function openManualModal() {
  manualFullName.value = ''
  manualCedula.value = ''
  manualEmail.value = ''
  manualTierId.value = ev.value?.tiers[0]?.id || ''
  manualErrors.value = {}
  manualSuccessTicketId.value = ''
  manualSuccessPdfUrl.value = ''
  manualHasReceipt.value = false
  manualReceiptFile.value = null
  showManualModal.value = true
}

function validateManual(): boolean {
  const errs: Record<string, string> = {}
  if (!manualFullName.value.trim()) errs.fullName = 'El nombre es obligatorio.'
  if (!/^[0-9-]{5,20}$/.test(manualCedula.value.trim())) errs.cedula = 'Cédula inválida (5-20 dígitos).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail.value.trim())) errs.email = 'Correo inválido.'
  if (!manualTierId.value) errs.tierId = 'Selecciona una etapa de entrada.'
  if (manualHasReceipt.value && !manualReceiptFile.value) {
    errs.receipt = 'El archivo de comprobante es obligatorio si se marca transferencia.'
  }
  manualErrors.value = errs
  return Object.keys(errs).length === 0
}

function onReceiptFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    manualReceiptFile.value = target.files[0] || null
  } else {
    manualReceiptFile.value = null
  }
}

async function onSubmitManual() {
  if (!validateManual()) return
  manualLoading.value = true
  try {
    let bodyData: any
    
    if (manualHasReceipt.value && manualReceiptFile.value) {
      const formData = new FormData()
      formData.append('fullName', manualFullName.value.trim())
      formData.append('cedula', manualCedula.value.trim())
      formData.append('email', manualEmail.value.trim())
      formData.append('tierId', manualTierId.value)
      formData.append('file', manualReceiptFile.value)
      bodyData = formData
    } else {
      bodyData = {
        fullName: manualFullName.value.trim(),
        cedula: manualCedula.value.trim(),
        email: manualEmail.value.trim(),
        tierId: manualTierId.value,
      }
    }

    const res = await $fetch<any>(`/api/events/${id}/attendees`, {
      method: 'POST',
      body: bodyData,
    })
    manualSuccessTicketId.value = res.ticketId
    manualSuccessPdfUrl.value = res.pdfUrl
    await refresh()
  } catch (err) {
    const data = (err as any)?.data
    alert(data?.message || 'Error al registrar el asistente.')
  } finally {
    manualLoading.value = false
  }
}

function copyWhatsAppMessage() {
  const text = `¡Hola *${manualFullName.value.trim()}*! 👋\n\nAquí tienes tu entrada para el evento *${ev.value?.name}*.\n\n🎟️ Descarga tu ticket PDF aquí: ${manualSuccessPdfUrl.value}\n\n¡Te esperamos!`
  navigator.clipboard.writeText(text).then(() => {
    alert('Mensaje copiado al portapapeles. Listo para enviar por WhatsApp.')
  }).catch(() => {
    alert('No se pudo copiar de forma automática. Selecciona y copia el texto del enlace.')
  })
}

function openReceipt(ticketId: string) {
  window.open(`/api/tickets/${ticketId}/receipt`, '_blank')
}
</script>

<template>
  <div class="space-y-6">
    <!-- AppPageHeader -->
    <AppPageHeader
      :title="`Asistentes: ${ev?.name || 'Cargando...'}`"
      subtitle="Visualiza, busca y descarga los asistentes registrados al evento."
      :breadcrumbs="[
        { label: 'Eventos', to: '/events' },
        { label: ev?.name || 'Evento', to: `/events/${id}` },
        { label: 'Asistentes' }
      ]"
    >
      <template #actions>
        <div class="flex gap-2">
          <AppButton variant="outline" size="md" @click="exportCSV">
            📥 Exportar CSV
          </AppButton>
          <AppButton variant="outline" size="md" :loading="bulkEmailLoading" @click="openBulkEmailModal">
            ✉️ Envío Masivo
          </AppButton>
          <AppButton size="md" @click="openManualModal">
            ➕ Registrar Asistente
          </AppButton>
        </div>
      </template>
    </AppPageHeader>

    <!-- Filtros -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
      <AppInput
        v-model="search"
        placeholder="Buscar por nombre, correo o cédula..."
      />
      <AppSelect
        v-model="tierFilter"
        placeholder="Todas las etapas"
        :options="uniqueTiers"
      />
      <AppSelect
        v-model="checkinFilter"
        placeholder="Todos los ingresos"
        :options="[
          { value: 'yes', label: 'Ingresados' },
          { value: 'no', label: 'Pendientes' },
          { value: 'void', label: 'Anulados' }
        ]"
      />
    </div>

    <!-- Contenido Principal -->
    <div v-if="pending" class="text-center py-12 text-slate-500">
      Cargando asistentes...
    </div>
    <div v-else-if="error" class="text-center py-12 text-rose-600">
      Error al cargar los asistentes del evento.
    </div>
    <div v-else-if="filteredAttendees.length === 0" class="py-4">
      <AppEmptyState
        title="No se encontraron asistentes"
        description="Prueba a cambiar tus filtros de búsqueda o invita al público a registrarse."
      />
    </div>

    <AppTable v-else>
      <template #headers>
        <th class="px-6 py-3">Nombre / Correo</th>
        <th class="px-6 py-3">Cédula</th>
        <th class="px-6 py-3">Tipo Ticket</th>
        <th class="px-6 py-3 text-center">Estado Ticket</th>
        <th class="px-6 py-3 text-center">Check-in</th>
        <th class="px-6 py-3" />
      </template>
      <tr
        v-for="att in filteredAttendees"
        :key="att.id"
        class="hover:bg-slate-50/75 transition-colors"
      >
        <!-- Nombre / Correo -->
        <td class="px-6 py-4">
          <div>
            <p class="font-bold text-slate-900 leading-none mb-1">{{ att.fullName }}</p>
            <p class="text-xs text-slate-500">{{ att.email }}</p>
          </div>
        </td>

        <!-- Cedula descifrada -->
        <td class="px-6 py-4 text-xs font-semibold text-slate-700">
          {{ att.cedula }}
        </td>

        <!-- Tipo Ticket -->
        <td class="px-6 py-4 text-xs font-bold text-slate-600">
          {{ att.ticket?.tierName || 'Desconocido' }}
        </td>

        <!-- Estado ticket -->
        <td class="px-6 py-4 text-center">
          <AppBadge
            :variant="
              att.ticket?.status === 'valid' ? 'info' : 
              att.ticket?.status === 'used' ? 'success' : 'danger'
            "
          >
            {{ 
              att.ticket?.status === 'valid' ? 'Válido' : 
              att.ticket?.status === 'used' ? 'Usado' : 'Anulado'
            }}
          </AppBadge>
        </td>

        <!-- Checkin -->
        <td class="px-6 py-4 text-center">
          <span
            class="inline-flex h-2.5 w-2.5 rounded-full"
            :class="att.ticket?.status === 'used' ? 'bg-emerald-500' : 'bg-slate-300'"
            :title="att.ticket?.status === 'used' ? 'Ingresó' : 'Pendiente'"
          />
        </td>

        <!-- Acciones -->
        <td class="px-6 py-4 text-right">
          <div class="flex justify-end gap-2">
            <AppButton
              v-if="att.ticket?.id && att.ticket.transferReceiptPath"
              variant="outline"
              size="sm"
              @click="openReceipt(att.ticket.id)"
            >
              💰 Recibo
            </AppButton>
            <AppButton
              v-if="att.ticket?.id && att.ticket.status !== 'void'"
              variant="outline"
              size="sm"
              :loading="emailLoading && sendingEmailTicketId === att.ticket.id"
              @click="onSendEmail(att.ticket.id)"
            >
              ✉️ Enviar
            </AppButton>
            <AppButton
              v-if="att.ticket?.id"
              variant="outline"
              size="sm"
              @click="openPdf(att.ticket.id)"
            >
              📄 PDF
            </AppButton>
            <AppButton
              v-if="att.ticket?.id && att.ticket.status !== 'void'"
              variant="warning"
              size="sm"
              @click="openVoidModal(att)"
            >
              Anular
            </AppButton>
            <AppButton
              v-if="att.ticket?.id"
              variant="danger"
              size="sm"
              @click="openDeleteModal(att)"
            >
              Eliminar
            </AppButton>
          </div>
        </td>
      </tr>
    </AppTable>

    <!-- Modal de confirmación para anulación de ticket -->
    <AppConfirmModal
      :show="showConfirmVoid"
      title="Anular ticket de ingreso"
      :message="`¿Estás seguro de que deseas anular el ticket de ${selectedAttendeeName}? Esta acción invalidará permanentemente su QR de ingreso.`"
      confirm-text="Anular permanentemente"
      variant="danger"
      :loading="voidLoading"
      @confirm="onConfirmVoid"
      @cancel="showConfirmVoid = false"
    />

    <!-- Modal de confirmación para eliminación de ticket -->
    <AppConfirmModal
      :show="showConfirmDelete"
      title="Eliminar ticket y asistente"
      :message="`¿Estás seguro de que deseas eliminar permanentemente el ticket y los datos de ${selectedAttendeeName}? Esta acción borrará el registro de la base de datos, eliminará sus archivos de almacenamiento y liberará su número de cédula. No se puede deshacer.`"
      confirm-text="Eliminar permanentemente"
      variant="danger"
      :loading="deleteLoading"
      @confirm="onConfirmDelete"
      @cancel="showConfirmDelete = false"
    />

    <!-- Modal de confirmación para envío masivo de correos -->
    <AppConfirmModal
      :show="showConfirmBulkEmail"
      title="Enviar entradas de forma masiva"
      :message="`¿Estás seguro de que deseas enviar las entradas por correo electrónico a todos los asistentes activos registrados para este evento?`"
      confirm-text="Sí, enviar a todos"
      variant="primary"
      :loading="bulkEmailLoading"
      @confirm="onConfirmBulkEmail"
      @cancel="showConfirmBulkEmail = false"
    />

    <!-- Modal de registro manual de asistente -->
    <div v-if="showManualModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-fade-in">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <h3 class="text-base font-bold text-slate-900">Registrar asistente manual</h3>
          <button type="button" class="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer" @click="showManualModal = false">×</button>
        </div>

        <!-- Vista de Éxito con PDF y Botón WhatsApp -->
        <div v-if="manualSuccessTicketId" class="space-y-4 text-center py-4">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg class="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h4 class="text-lg font-bold text-slate-900">¡Registro manual exitoso!</h4>
          <p class="text-xs text-slate-500">Se ha generado el ticket y cargado el PDF criptográfico.</p>

          <div class="pt-4 space-y-2">
            <a
              :href="manualSuccessPdfUrl"
              target="_blank"
              rel="noopener"
              class="flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              📥 Descargar Ticket (PDF)
            </a>
            
            <button
              type="button"
              class="flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors gap-1.5 cursor-pointer"
              @click="copyWhatsAppMessage"
            >
              💬 Copiar mensaje para WhatsApp
            </button>
          </div>
        </div>

        <!-- Formulario de Registro -->
        <form v-else class="space-y-4" @submit.prevent="onSubmitManual">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1" for="manual-fullName">Nombre completo</label>
            <input
              id="manual-fullName"
              v-model="manualFullName"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              placeholder="Ej. Juan Pérez"
            />
            <p v-if="manualErrors.fullName" class="mt-1 text-xs text-rose-600 font-medium">{{ manualErrors.fullName }}</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1" for="manual-cedula">Cédula</label>
            <input
              id="manual-cedula"
              v-model="manualCedula"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              placeholder="Ej. 10203040"
            />
            <p v-if="manualErrors.cedula" class="mt-1 text-xs text-rose-600 font-medium">{{ manualErrors.cedula }}</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1" for="manual-email">Correo electrónico</label>
            <input
              id="manual-email"
              v-model="manualEmail"
              type="email"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              placeholder="Ej. juan@correo.com"
            />
            <p v-if="manualErrors.email" class="mt-1 text-xs text-rose-600 font-medium">{{ manualErrors.email }}</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1" for="manual-tier">Etapa de entrada</label>
            <select
              id="manual-tier"
              v-model="manualTierId"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none bg-white"
            >
              <option v-for="t in ev?.tiers" :key="t.id" :value="t.id">
                {{ t.name }} — {{ t.price === 0 ? 'Gratis' : `${t.price.toLocaleString('es-CO')} ${t.currency}` }}
              </option>
            </select>
            <p v-if="manualErrors.tierId" class="mt-1 text-xs text-rose-600 font-medium">{{ manualErrors.tierId }}</p>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input
              id="manual-hasReceipt"
              v-model="manualHasReceipt"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
            />
            <label for="manual-hasReceipt" class="text-sm font-semibold text-slate-700 cursor-pointer select-none">
              Comprobante transferencia
            </label>
          </div>

          <div v-if="manualHasReceipt" class="space-y-1 pt-1">
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1" for="manual-receipt">
              Archivo de comprobante (JPG, PNG, WEBP, PDF - Máx. 5MB)
            </label>
            <input
              id="manual-receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none bg-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
              @change="onReceiptFileChange"
            />
            <p v-if="manualErrors.receipt" class="mt-1 text-xs text-rose-600 font-medium">{{ manualErrors.receipt }}</p>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
            <AppButton variant="outline" size="sm" type="button" @click="showManualModal = false">
              Cancelar
            </AppButton>
            <AppButton size="sm" type="submit" :loading="manualLoading">
              Emitir Ticket
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

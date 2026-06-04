<script setup lang="ts">
import type { EventCreate } from '~/types/events'

const props = defineProps<{
  initial?: Partial<EventCreate>
  loading?: boolean
  submitLabel?: string
  eventId?: string
}>()

const emit = defineEmits<{ submit: [payload: EventCreate] }>()

/** Convierte un ISO 8601 al formato del input datetime-local (hora local). */
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const name = ref(props.initial?.name ?? '')
const venue = ref(props.initial?.venue ?? '')
const eventAtLocal = ref(isoToLocalInput(props.initial?.eventAt))
const description = ref(props.initial?.description ?? '')
const flyerUrl = ref(props.initial?.flyerUrl ?? '')

const uploadError = ref('')
const uploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const errors = reactive<Record<string, string>>({})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  if (!name.value.trim()) errors.name = 'El nombre es obligatorio.'
  if (!venue.value.trim()) errors.venue = 'El lugar es obligatorio.'
  if (!eventAtLocal.value || Number.isNaN(Date.parse(eventAtLocal.value))) {
    errors.eventAt = 'La fecha y hora son obligatorias.'
  }
  return Object.keys(errors).length === 0
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadError.value = ''
  uploading.value = true

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = 'Formato de imagen inválido. Solo se admiten JPG, PNG, WEBP o GIF.'
    uploading.value = false
    return
  }

  const maxBytes = 5 * 1024 * 1024
  if (file.size > maxBytes) {
    uploadError.value = 'El archivo excede el tamaño límite permitido de 5 MB.'
    uploading.value = false
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await $fetch<{ flyerUrl: string }>(`/api/events/${props.eventId}/flyer`, {
      method: 'POST',
      body: formData,
    })
    flyerUrl.value = res.flyerUrl
  } catch (err) {
    const e = err as { data?: { message?: string } }
    uploadError.value = e.data?.message ?? 'No se pudo subir la imagen del flyer.'
  } finally {
    uploading.value = false
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function removeFlyer() {
  flyerUrl.value = ''
  uploadError.value = ''
}

function onSubmit() {
  if (props.loading) return
  if (!validate()) return
  emit('submit', {
    name: name.value.trim(),
    venue: venue.value.trim(),
    eventAt: new Date(eventAtLocal.value).toISOString(),
    description: description.value.trim() || null,
    flyerUrl: flyerUrl.value.trim() || null,
  })
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="onSubmit">
    <div>
      <label class="block text-sm font-medium text-slate-700" for="ev-name">Nombre</label>
      <input
        id="ev-name"
        v-model="name"
        type="text"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.name" class="mt-1 text-xs text-rose-600">{{ errors.name }}</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700" for="ev-venue">Lugar</label>
      <input
        id="ev-venue"
        v-model="venue"
        type="text"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.venue" class="mt-1 text-xs text-rose-600">{{ errors.venue }}</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700" for="ev-date">Fecha y hora</label>
      <input
        id="ev-date"
        v-model="eventAtLocal"
        type="datetime-local"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      >
      <p v-if="errors.eventAt" class="mt-1 text-xs text-rose-600">{{ errors.eventAt }}</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700" for="ev-desc">Descripción (opcional)</label>
      <textarea
        id="ev-desc"
        v-model="description"
        rows="3"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700">Flyer Promocional (HD)</label>
      
      <!-- Si el evento ya existe (tenemos eventId) -->
      <div v-if="eventId" class="mt-1 space-y-2">
        <!-- Input de archivo oculto -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFileChange"
        />

        <!-- Estado 1: Ya tiene imagen cargada -->
        <div v-if="flyerUrl.trim()" class="relative rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden max-w-md aspect-video group shadow-xs">
          <img :src="flyerUrl.trim()" alt="Flyer del evento" class="object-cover w-full h-full" />
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer border-0"
              @click="triggerFileInput"
            >
              Cambiar imagen
            </button>
            <button
              type="button"
              class="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm cursor-pointer border-0"
              @click="removeFlyer"
            >
              Eliminar
            </button>
          </div>
        </div>

        <!-- Estado 2: Cargando archivo -->
        <div
          v-else-if="uploading"
          class="border-2 border-dashed border-violet-300 rounded-2xl p-8 flex flex-col items-center justify-center bg-violet-50/20 max-w-md aspect-video animate-pulse"
        >
          <div class="h-10 w-10 rounded-full border-2 border-violet-600 border-t-transparent animate-spin mb-2" />
          <span class="text-xs font-semibold text-violet-600">Subiendo imagen del flyer...</span>
        </div>

        <!-- Estado 3: No tiene imagen cargada (Cargador interactivo) -->
        <div
          v-else
          class="border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-slate-50/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all max-w-md aspect-video group"
          @click="triggerFileInput"
        >
          <div class="h-12 w-12 rounded-xl bg-slate-100 group-hover:bg-violet-50 flex items-center justify-center text-slate-400 group-hover:text-violet-600 transition-colors mb-3">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span class="text-xs font-bold text-slate-700 group-hover:text-violet-700 transition-colors">Cargar Flyer HD</span>
          <span class="text-[10px] text-slate-400 mt-1">Formatos JPG, PNG, WEBP o GIF (máx. 5 MB)</span>
        </div>

        <!-- Errores de carga -->
        <p v-if="uploadError" class="mt-1 text-xs text-rose-600 font-medium">{{ uploadError }}</p>
      </div>

      <!-- Si el evento se está creando (no tiene eventId) -->
      <div v-else class="mt-1 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
        <p class="text-xs text-slate-500 font-medium leading-relaxed">
          💡 Podrás subir el flyer promocional en alta definición una vez que el evento haya sido creado.
        </p>
      </div>
    </div>

    <button
      type="submit"
      :disabled="loading || uploading"
      class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 border-0"
    >
      {{ loading ? 'Guardando…' : (submitLabel ?? 'Guardar') }}
    </button>
  </form>
</template>


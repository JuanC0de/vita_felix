<script setup lang="ts">
const emit = defineEmits<{ detected: [token: string] }>()

const video = ref<HTMLVideoElement | null>(null)
const cameraError = ref('')
const supported = ref(true)
const manualToken = ref('')
let stream: MediaStream | null = null
let rafId = 0
let detector: { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } | null = null
let lastEmit = 0

async function start() {
  const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => typeof detector }).BarcodeDetector
  if (!BD) {
    supported.value = false
    return
  }
  try {
    detector = new BD({ formats: ['qr_code'] })
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (video.value) {
      video.value.srcObject = stream
      await video.value.play()
      scanLoop()
    }
  } catch {
    cameraError.value = 'No se pudo acceder a la cámara. Usa la entrada manual.'
    supported.value = false
  }
}

async function scanLoop() {
  if (!detector || !video.value) return
  try {
    const codes = await detector.detect(video.value)
    const first = codes[0]
    const now = Date.now()
    if (first && now - lastEmit > 2500) {
      lastEmit = now
      emit('detected', first.rawValue)
    }
  } catch {
    // Ignorar fallos de frame puntuales.
  }
  rafId = requestAnimationFrame(scanLoop)
}

function submitManual() {
  const token = manualToken.value.trim()
  if (token) {
    emit('detected', token)
    manualToken.value = ''
  }
}

function stop() {
  cancelAnimationFrame(rafId)
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <div class="space-y-4">
    <div v-if="supported" class="overflow-hidden rounded-lg border border-slate-200 bg-black">
      <video ref="video" class="aspect-square w-full object-cover" muted playsinline />
    </div>

    <p v-if="cameraError" class="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {{ cameraError }}
    </p>
    <p v-else-if="!supported" class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      Tu navegador no soporta el escaneo automático. Ingresa el código manualmente.
    </p>

    <div class="space-y-2">
      <label class="block text-sm font-medium text-slate-700" for="manual">Código (entrada manual)</label>
      <div class="flex gap-2">
        <input
          id="manual"
          v-model="manualToken"
          type="text"
          placeholder="Pega aquí el contenido del QR"
          class="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          @keyup.enter="submitManual"
        />
        <button
          type="button"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          @click="submitManual"
        >
          Validar
        </button>
      </div>
    </div>
  </div>
</template>

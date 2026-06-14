<script setup lang="ts">
import jsQR from 'jsqr'

const emit = defineEmits<{ detected: [token: string] }>()

const video = ref<HTMLVideoElement | null>(null)
const cameraError = ref('')
const supported = ref(true)
const manualToken = ref('')
let stream: MediaStream | null = null
let rafId = 0
let lastEmit = 0

// Canvas en memoria para procesamiento de fotogramas de video
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

/**
 * Inicializa la cámara del dispositivo y el canvas para procesamiento de fotogramas.
 */
async function start() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Tu navegador no soporta el acceso a la cámara o requiere una conexión segura (HTTPS). Usa la entrada manual.'
    supported.value = false
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (video.value) {
      video.value.srcObject = stream
      await video.value.play()
      
      // Crear canvas de procesamiento en memoria
      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      scanLoop()
    }
  } catch (err) {
    console.error('Error al inicializar el dispositivo de video:', err)
    cameraError.value = 'No se pudo acceder a la cámara. Concede los permisos del navegador o ingresa el código de forma manual.'
  }
}

/**
 * Bucle de escaneo fotograma a fotograma usando jsQR.
 */
function scanLoop() {
  if (!video.value || !canvas || !ctx) return
  
  if (video.value.readyState === video.value.HAVE_ENOUGH_DATA) {
    const width = video.value.videoWidth
    const height = video.value.videoHeight
    canvas.width = width
    canvas.height = height
    
    ctx.drawImage(video.value, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    
    // Decodificar el código QR desde los datos de imagen
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })
    
    const now = Date.now()
    if (code && code.data && now - lastEmit > 2500) {
      lastEmit = now
      emit('detected', code.data)
    }
  }
  
  rafId = requestAnimationFrame(scanLoop)
}

/**
 * Envía el código ingresado de forma manual.
 */
function submitManual() {
  const token = manualToken.value.trim()
  if (token) {
    emit('detected', token)
    manualToken.value = ''
  }
}

/**
 * Detiene las transmisiones de la cámara y cancela el bucle de renderizado.
 */
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

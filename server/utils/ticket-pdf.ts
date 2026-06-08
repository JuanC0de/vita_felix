import QRCode from 'qrcode'
import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  clip,
  endPath,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath
} from 'pdf-lib'
import type { RGB } from 'pdf-lib'
import type { EventThemeConfig } from '../../app/types/events'

/**
 * Estructura de datos requerida para la generación del ticket en PDF.
 */
export interface TicketPdfData {
  qrToken: string
  eventName: string
  venue: string
  eventAt: string
  tierName: string
  attendeeName: string
  ticketId: string
  flyerUrl?: string | null
  themeConfig?: EventThemeConfig | null
  organizerName?: string | null
  isSpecialGuest?: boolean
  hostName?: string | null
}

/**
 * Genera el código corto legible a partir del identificador de ticket.
 */
export function getShortCode(ticketId: string): string {
  const clean = ticketId.replace(/-/g, '').toUpperCase()
  return `VF-${clean.slice(0, 7)}`
}

/**
 * Genera el buffer del código QR en formato PNG.
 */
async function renderQrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 300,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

/**
 * Descarga una imagen desde una URL pública y devuelve su buffer.
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (e) {
    return null
  }
}

/**
 * Formatea una fecha en formato ISO a una representación localizada en español.
 */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
}

/**
 * Convierte una cadena de color hexadecimal a un objeto RGB de pdf-lib.
 */
function parseHexColor(hex?: string | null, fallback: RGB = rgb(0, 0, 0)): RGB {
  if (!hex) return fallback
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) return fallback

  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return fallback
  }

  return rgb(r / 255, g / 255, b / 255)
}
/**
 * Dibuja un fondo con degradado lineal vertical en el área del hero.
 */
function drawGradient(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  c1: RGB,
  c2: RGB
) {
  for (let i = 0; i < height; i++) {
    const ratio = i / height
    const r = c1.red + ratio * (c2.red - c1.red)
    const g = c1.green + ratio * (c2.green - c1.green)
    const b = c1.blue + ratio * (c2.blue - c1.blue)
    page.drawLine({
      start: { x: x, y: y + i },
      end: { x: x + width, y: y + i },
      thickness: 1.5,
      color: rgb(r, g, b),
    })
  }
}

/**
 * Aplica una ruta de clip con esquinas redondeadas sobre la página utilizando operadores PDF.
 */
function clipRoundedRect(page: any, x: number, y: number, w: number, h: number, r: number) {
  const k = 0.5522847
  const ak = r * (1 - k)
  page.pushOperators(
    pushGraphicsState(),
    moveTo(x + r, y),
    lineTo(x + w - r, y),
    appendBezierCurve(x + w - ak, y, x + w, y + ak, x + w, y + r),
    lineTo(x + w, y + h - r),
    appendBezierCurve(x + w, y + h - ak, x + w - ak, y + h, x + w - r, y + h),
    lineTo(x + r, y + h),
    appendBezierCurve(x + ak, y + h, x, y + h - ak, x, y + h - r),
    lineTo(x, y + r),
    appendBezierCurve(x, y + ak, x + ak, y, x + r, y),
    closePath(),
    clip(),
    endPath()
  )
}

/**
 * Construye el PDF del ticket con un diseño premium y adaptativo.
 */
export async function generateTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([420, 720])
  const { width, height } = page.getSize()

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Configuración de colores dinámica mediante el tema
  const fallbackPrimary = rgb(0.49, 0.18, 0.90) // Violeta
  const fallbackSecondary = rgb(0.06, 0.73, 0.51) // Esmeralda
  const fallbackGradStart = rgb(0.06, 0.09, 0.16) // Pizarra oscuro
  const fallbackGradEnd = rgb(0.12, 0.11, 0.29) // Violeta oscuro

  const theme = data.themeConfig
  const primaryColor = parseHexColor(theme ? (theme.primaryColor || theme.accentColor) : undefined, fallbackPrimary)
  const secondaryColor = parseHexColor(theme ? (theme.accentColor || theme.secondaryColor) : undefined, fallbackSecondary)
  
  // Soporte para color único plano o degradado configurable en el hero
  let gradStart = fallbackGradStart
  let gradEnd = fallbackGradEnd
  if (theme) {
    if (theme.heroBackground) {
      const parsedBg = parseHexColor(theme.heroBackground, fallbackGradStart)
      gradStart = parsedBg
      gradEnd = parsedBg
    }
    if (theme.gradientStart) {
      gradStart = parseHexColor(theme.gradientStart, gradStart)
    }
    if (theme.gradientEnd) {
      gradEnd = parseHexColor(theme.gradientEnd, gradEnd)
    }
  }

  const background = rgb(0.96, 0.97, 0.98)
  const isSpecial = !!data.isSpecialGuest
  const cardBg = isSpecial ? rgb(0.99, 0.98, 0.94) : rgb(1, 1, 1)
  const cardBorder = isSpecial ? rgb(0.83, 0.68, 0.21) : rgb(0.88, 0.91, 0.94)
  const ink = rgb(0.06, 0.09, 0.16)
  const muted = rgb(0.42, 0.45, 0.5)

  // Dibujar fondo de la página
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: background,
  })

  // Dibujar tarjeta principal del ticket
  page.drawRectangle({
    x: 20,
    y: 30,
    width: 380,
    height: 660,
    color: cardBg,
    borderColor: cardBorder,
    borderWidth: isSpecial ? 1.5 : 1,
  })

  // Dibujar degradado en el hero superior de la tarjeta (y = 470 a 690)
  drawGradient(page, 20, 470, 380, 220, gradStart, gradEnd)

  // Cargar flyer promocional
  let flyerEmbed
  if (data.flyerUrl) {
    const buffer = await fetchImageBuffer(data.flyerUrl)
    if (buffer) {
      try {
        if (data.flyerUrl.toLowerCase().endsWith('.png')) {
          flyerEmbed = await pdf.embedPng(buffer)
        } else {
          flyerEmbed = await pdf.embedJpg(buffer)
        }
      } catch (e) {
        try {
          if (data.flyerUrl.toLowerCase().endsWith('.png')) {
            flyerEmbed = await pdf.embedJpg(buffer)
          } else {
            flyerEmbed = await pdf.embedPng(buffer)
          }
        } catch (inner) {
          // Omitir si el formato no es compatible
        }
      }
    }
  }

  // Cargar logotipo secundario si existe
  let logoEmbed
  if (theme && theme.logoUrl) {
    const logoBuffer = await fetchImageBuffer(theme.logoUrl)
    if (logoBuffer) {
      try {
        if (theme.logoUrl.toLowerCase().endsWith('.png')) {
          logoEmbed = await pdf.embedPng(logoBuffer)
        } else {
          logoEmbed = await pdf.embedJpg(logoBuffer)
        }
      } catch (e) {
        try {
          if (theme.logoUrl.toLowerCase().endsWith('.png')) {
            logoEmbed = await pdf.embedJpg(logoBuffer)
          } else {
            logoEmbed = await pdf.embedPng(logoBuffer)
          }
        } catch (inner) {
          // Omitir si el formato no es compatible
        }
      }
    }
  }

  if (flyerEmbed) {
    const imgWidth = flyerEmbed.width
    const imgHeight = flyerEmbed.height
    // Object-fit contain ajustado proporcionalmente a un espacio máximo de 340x180
    const scale = Math.min(340 / imgWidth, 180 / imgHeight)
    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale
    const xOffset = (380 - scaledWidth) / 2
    const yOffset = (220 - scaledHeight) / 2

    const fx = 20 + xOffset
    const fy = 470 + yOffset

    // Dibujar sombra del flyer
    const shadowColor = rgb(0, 0, 0)
    for (let i = 8; i > 0; i--) {
      page.drawRectangle({
        x: fx - i,
        y: fy - i,
        width: scaledWidth + 2 * i,
        height: scaledHeight + 2 * i,
        color: shadowColor,
        opacity: 0.012 * (9 - i),
      })
    }

    // Dibujar flyer aplicando bordes redondeados
    clipRoundedRect(page, fx, fy, scaledWidth, scaledHeight, 10)
    page.drawImage(flyerEmbed, {
      x: fx,
      y: fy,
      width: scaledWidth,
      height: scaledHeight,
    })
    page.pushOperators(popGraphicsState())
  } else {
    // Cabecera por defecto si no hay flyer
    const headerTitle = isSpecial ? 'INVITACIÓN ESPECIAL' : 'TICKET DE ACCESO'
    const brandText = 'VITA FELIX'
    const headerTitleW = bold.widthOfTextAtSize(headerTitle, 16)
    const brandTextW = font.widthOfTextAtSize(brandText, 12)

    page.drawText(headerTitle, {
      x: (width - headerTitleW) / 2,
      y: 590,
      size: 16,
      font: bold,
      color: rgb(1, 1, 1),
    })

    page.drawText(brandText, {
      x: (width - brandTextW) / 2,
      y: 565,
      size: 12,
      font,
      color: rgb(0.8, 0.85, 0.95),
    })
  }

  const drawCentered = (text: string, y: number, size: number, f = font, color = ink) => {
    const w = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (width - w) / 2, y, size, font: f, color })
  }

  // 1) Badge de tipo de boleta (tier)
  const badgeText = isSpecial ? `${data.tierName.toUpperCase()} · INVITADO ESPECIAL` : data.tierName.toUpperCase()
  const badgeFontSize = 9
  const textW = bold.widthOfTextAtSize(badgeText, badgeFontSize)
  const badgeW = textW + 16
  const badgeH = 18
  const badgeX = (width - badgeW) / 2
  const badgeY = 432
  const br = badgeH / 2
  const currentBadgeColor = isSpecial ? rgb(0.83, 0.68, 0.21) : primaryColor

  page.drawRectangle({
    x: badgeX + br,
    y: badgeY,
    width: badgeW - 2 * br,
    height: badgeH,
    color: currentBadgeColor,
  })
  page.drawCircle({
    x: badgeX + br,
    y: badgeY + br,
    size: br,
    color: currentBadgeColor,
  })
  page.drawCircle({
    x: badgeX + badgeW - br,
    y: badgeY + br,
    size: br,
    color: currentBadgeColor,
  })
  page.drawText(badgeText, {
    x: badgeX + 8,
    y: badgeY + 5,
    size: badgeFontSize,
    font: bold,
    color: rgb(1, 1, 1),
  })

  // 2) Nombre del evento
  let eventNameSize = 18
  while (eventNameSize > 10 && bold.widthOfTextAtSize(data.eventName, eventNameSize) > 340) {
    eventNameSize -= 1
  }
  drawCentered(data.eventName, 398, eventNameSize, bold, ink)

  // 3) Lugar del evento
  let venueSize = 11
  while (venueSize > 8 && font.widthOfTextAtSize(data.venue, venueSize) > 340) {
    venueSize -= 1
  }
  drawCentered(data.venue, 376, venueSize, font, muted)

  // 4) Fecha y hora del evento
  drawCentered(formatDate(data.eventAt), 356, 10, font, muted)

  // 5) Campo opcional "Organiza: {{organizerName}}"
  if (data.organizerName) {
    drawCentered(`Organiza: ${data.organizerName}`, 340, 9, font, muted)
  }

  // 6) Línea divisoria superior de la sección QR (punteada con cortes laterales)
  page.drawLine({
    start: { x: 26, y: 332 },
    end: { x: 394, y: 332 },
    thickness: 0.8,
    color: cardBorder,
    dashArray: [3, 3],
    opacity: 0.5,
  })

  // Cortes semicirculares laterales superiores
  page.drawCircle({
    x: 20,
    y: 332,
    size: 6,
    color: background,
    borderColor: cardBorder,
    borderWidth: 1,
    borderOpacity: 0.5,
  })
  page.drawCircle({
    x: 400,
    y: 332,
    size: 6,
    color: background,
    borderColor: cardBorder,
    borderWidth: 1,
    borderOpacity: 0.5,
  })

  // Texto superior pequeño informativo
  const qrTopText = isSpecial ? 'PRESENTA ESTE CÓDIGO · INVITADO ESPECIAL' : 'PRESENTA ESTE CÓDIGO EN LA ENTRADA'
  const qrTopColor = isSpecial ? rgb(0.83, 0.68, 0.21) : primaryColor
  drawCentered(qrTopText, 318, 7.5, bold, qrTopColor)

  // Renderizar el código QR directamente sobre el fondo blanco nativo (sin tarjeta, min 190px)
  const qrPng = await pdf.embedPng(await renderQrPng(data.qrToken))
  const qrSize = 190
  const qx = (width - qrSize) / 2
  const qy = 118
  page.drawImage(qrPng, {
    x: qx,
    y: qy,
    width: qrSize,
    height: qrSize,
  })

  // Texto inferior pequeño informativo
  if (isSpecial && data.hostName) {
    drawCentered(`Cortesía exclusiva · Invitado por: ${data.hostName}`, 104, 7.5, bold, rgb(0.83, 0.68, 0.21))
  } else {
    drawCentered('Entrada válida para una persona', 104, 7.5, font, muted)
  }

  // Línea divisoria inferior de la sección QR (punteada con cortes laterales)
  page.drawLine({
    start: { x: 26, y: 94 },
    end: { x: 394, y: 94 },
    thickness: 0.8,
    color: cardBorder,
    dashArray: [3, 3],
    opacity: 0.5,
  })

  // Cortes semicirculares laterales inferiores
  page.drawCircle({
    x: 20,
    y: 94,
    size: 6,
    color: background,
    borderColor: cardBorder,
    borderWidth: 1,
    borderOpacity: 0.5,
  })
  page.drawCircle({
    x: 400,
    y: 94,
    size: 6,
    color: background,
    borderColor: cardBorder,
    borderWidth: 1,
    borderOpacity: 0.5,
  })

  // 7) Datos del asistente
  drawCentered('ASISTENTE', 78, 7.5, bold, primaryColor)
  let attendeeNameSize = 12
  while (attendeeNameSize > 9 && bold.widthOfTextAtSize(data.attendeeName, attendeeNameSize) > 340) {
    attendeeNameSize -= 1
  }
  drawCentered(data.attendeeName, 64, attendeeNameSize, bold, ink)

  // 8) Código corto del ticket protagonista
  const shortCode = getShortCode(data.ticketId)
  drawCentered(shortCode, 48, 9, bold, ink)

  // 9) Footer corporativo coloreado
  if (logoEmbed) {
    const logoMaxW = 60
    const logoMaxH = 14
    const logoScale = Math.min(logoMaxW / logoEmbed.width, logoMaxH / logoEmbed.height)
    const logoW = logoEmbed.width * logoScale
    const logoH = logoEmbed.height * logoScale
    page.drawImage(logoEmbed, {
      x: (width - logoW) / 2,
      y: 36,
      width: logoW,
      height: logoH,
    })
  } else {
    drawCentered('POWERED BY VITA FELIX', 36, 7.5, bold, primaryColor)
  }

  // Identificador de ticket interno muy discreto con margen inferior
  drawCentered(`ID: ${data.ticketId}`, 14, 4.5, font, rgb(0.83, 0.85, 0.87))

  return pdf.save()
}

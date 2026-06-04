import QRCode from 'qrcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * Datos requeridos para la generación del ticket en PDF.
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
 * Formatea una fecha en formato ISO a una representación localizada.
 */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
}

/**
 * Construye el PDF del ticket con diseño corporativo y estructurado.
 */
export async function generateTicketPdf(data: TicketPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([420, 720])
  const { width, height } = page.getSize()

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const background = rgb(0.97, 0.98, 0.99)
  const cardBg = rgb(1, 1, 1)
  const cardBorder = rgb(0.88, 0.91, 0.94)
  const ink = rgb(0.06, 0.09, 0.16)
  const muted = rgb(0.42, 0.45, 0.5)
  const brand = rgb(0.49, 0.18, 0.9)

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: background,
  })

  page.drawRectangle({
    x: 20,
    y: 30,
    width: 380,
    height: 660,
    color: cardBg,
    borderColor: cardBorder,
    borderWidth: 1,
  })

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
          // Se omite si el formato no es compatible
        }
      }
    }
  }

  if (flyerEmbed) {
    page.drawRectangle({
      x: 20,
      y: 490,
      width: 380,
      height: 200,
      color: rgb(0.06, 0.09, 0.16),
    })

    const imgWidth = flyerEmbed.width
    const imgHeight = flyerEmbed.height
    const scale = Math.min(380 / imgWidth, 200 / imgHeight)
    const scaledWidth = imgWidth * scale
    const scaledHeight = imgHeight * scale
    const xOffset = (380 - scaledWidth) / 2
    const yOffset = (200 - scaledHeight) / 2

    page.drawImage(flyerEmbed, {
      x: 20 + xOffset,
      y: 490 + yOffset,
      width: scaledWidth,
      height: scaledHeight,
    })
  } else {
    page.drawRectangle({
      x: 20,
      y: 490,
      width: 380,
      height: 200,
      color: rgb(0.09, 0.12, 0.22),
    })

    const headerTitle = 'TICKET DE ACCESO'
    const brandText = 'VITA FELIX'
    const headerTitleW = bold.widthOfTextAtSize(headerTitle, 16)
    const brandTextW = font.widthOfTextAtSize(brandText, 12)

    page.drawText(headerTitle, {
      x: (width - headerTitleW) / 2,
      y: 600,
      size: 16,
      font: bold,
      color: rgb(1, 1, 1),
    })

    page.drawText(brandText, {
      x: (width - brandTextW) / 2,
      y: 575,
      size: 12,
      font,
      color: rgb(0.7, 0.75, 0.85),
    })
  }

  const drawCentered = (text: string, y: number, size: number, f = font, color = ink) => {
    const w = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (width - w) / 2, y, size, font: f, color })
  }

  let eventNameSize = 16
  while (eventNameSize > 10 && bold.widthOfTextAtSize(data.eventName, eventNameSize) > 340) {
    eventNameSize -= 1
  }
  drawCentered(data.eventName, 455, eventNameSize, bold)

  let venueSize = 11
  while (venueSize > 8 && font.widthOfTextAtSize(data.venue, venueSize) > 340) {
    venueSize -= 1
  }
  drawCentered(data.venue, 432, venueSize, font, muted)
  drawCentered(formatDate(data.eventAt), 412, 11, font, muted)

  page.drawLine({
    start: { x: 40, y: 390 },
    end: { x: 380, y: 390 },
    thickness: 1,
    color: cardBorder,
  })

  drawCentered('Presenta este código en la entrada', 365, 10, font, muted)

  const qrPng = await pdf.embedPng(await renderQrPng(data.qrToken))
  const qrSize = 150
  page.drawImage(qrPng, {
    x: (width - qrSize) / 2,
    y: 200,
    width: qrSize,
    height: qrSize,
  })

  page.drawLine({
    start: { x: 20, y: 175 },
    end: { x: 400, y: 175 },
    thickness: 1,
    color: cardBorder,
    dashArray: [4, 4],
  })

  let attendeeNameSize = 14
  while (attendeeNameSize > 9 && bold.widthOfTextAtSize(data.attendeeName, attendeeNameSize) > 340) {
    attendeeNameSize -= 1
  }
  drawCentered(data.attendeeName, 140, attendeeNameSize, bold)
  drawCentered(`Boleta: ${data.tierName}`, 120, 11, font, ink)
  drawCentered('VITA FELIX', 80, 10, bold, brand)
  drawCentered(`Ticket: ${data.ticketId}`, 55, 8, font, muted)

  return pdf.save()
}

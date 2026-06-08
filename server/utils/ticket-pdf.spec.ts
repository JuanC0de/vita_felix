import { describe, expect, it, vi } from 'vitest'
import { generateTicketPdf, getShortCode } from './ticket-pdf'

describe('ticket-pdf: generación de PDF', () => {
  const mockData = {
    qrToken: 'test-token',
    eventName: 'Concierto de Prueba con un Nombre Extremadamente Largo para Validar Reducción Dinámica de Tamaño',
    venue: 'Movistar Arena Principal',
    eventAt: '2026-06-03T18:00:00Z',
    tierName: 'VIP Oro',
    attendeeName: 'Juan Pérez de la Santísima Trinidad López',
    ticketId: '12345-67890-abcde',
    organizerName: 'Producciones Fénix',
  }

  it('obtiene el código corto en formato VF-XXXXXXX de forma correcta', () => {
    const ticketId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const shortCode = getShortCode(ticketId)
    expect(shortCode).toBe('VF-F47AC10')
  })

  it('genera un PDF en bytes (Uint8Array) correctamente sin flyer', async () => {
    const bytes = await generateTicketPdf({
      ...mockData,
      flyerUrl: null,
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('genera un PDF con configuración de tema personalizada', async () => {
    const bytes = await generateTicketPdf({
      ...mockData,
      flyerUrl: null,
      themeConfig: {
        primaryColor: '#EF4444',
        secondaryColor: '#3B82F6',
        gradientStart: '#1E293B',
        gradientEnd: '#0F172A',
        logoUrl: 'https://example.com/logo.png',
      },
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('genera un PDF especial para invitados de cortesía (isSpecialGuest y hostName)', async () => {
    const bytes = await generateTicketPdf({
      ...mockData,
      flyerUrl: null,
      isSpecialGuest: true,
      hostName: 'DJ Armin',
    })
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('maneja y omite un flyer con formato inválido o descarga fallida', async () => {
    // Simular error de red al intentar descargar el flyer
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const bytes = await generateTicketPdf({
      ...mockData,
      flyerUrl: 'https://example.com/flyer.webp',
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
    expect(fetchSpy).toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('carga y dibuja correctamente un flyer PNG simulado', async () => {
    // Generar un PNG mínimo de 1x1 para simular la descarga
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const pngBuffer = Buffer.from(pngBase64, 'base64')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => pngBuffer.buffer,
    } as any)

    const bytes = await generateTicketPdf({
      ...mockData,
      flyerUrl: 'https://example.com/flyer.png',
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
    expect(fetchSpy).toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})

import { getTicketingSecrets } from './ticketing-config'

interface EmailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

/**
 * Despacha un correo electrónico informativo con soporte para adjuntos.
 * Intenta utilizar la API de Resend o un transportador SMTP según las variables de entorno.
 * Si no hay credenciales configuradas, simula el envío imprimiendo los detalles en la consola.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.NUXT_RESEND_API_KEY || process.env.RESEND_API_KEY
  const fromEmail = process.env.NUXT_EMAIL_FROM || 'Vita Felix <onboarding@resend.dev>'
  
  const smtpHost = process.env.NUXT_SMTP_HOST
  const smtpPort = process.env.NUXT_SMTP_PORT
  const smtpUser = process.env.NUXT_SMTP_USER
  const smtpPass = process.env.NUXT_SMTP_PASSWORD

  // 1) Caso de uso: Resend API (HTTP POST)
  if (apiKey) {
    try {
      const attachmentsPayload = options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content.toString('base64'),
      }))

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          attachments: attachmentsPayload,
        }),
      })

      if (response.ok) {
        return true
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error al enviar correo mediante Resend API:', errorData)
      }
    } catch (err) {
      console.error('Error de red al conectar con Resend API:', err)
    }
  }

  // 2) Caso de uso: SMTP tradicional
  if (smtpHost) {
    try {
      // Importación dinámica para evitar fallos de compilación si nodemailer no está instalado
      const nodemailer = await import('nodemailer').catch(() => {
        throw new Error('Nodemailer no está instalado en el proyecto. Ejecuta npm install nodemailer.')
      })

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort) || 587,
        secure: smtpPort === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const mailOptions = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      }

      await transporter.sendMail(mailOptions)
      return true
    } catch (err: any) {
      console.error('Error al enviar correo mediante SMTP:', err.message || err)
    }
  }

  // 3) Caso por defecto: Simulación en entorno de desarrollo local
  console.log('=== [SIMULACIÓN DE ENVÍO DE CORREO] ===')
  console.log(`De:      ${fromEmail}`)
  console.log(`Para:    ${options.to}`)
  console.log(`Asunto:  ${options.subject}`)
  console.log(`Contenido (HTML):`)
  console.log(options.html)
  if (options.attachments && options.attachments.length > 0) {
    console.log('Archivos Adjuntos:')
    options.attachments.forEach((att) => {
      console.log(`- Nombre: ${att.filename} (${att.contentType}) [Tamaño: ${att.content.length} bytes]`)
    })
  }
  console.log('========================================')
  return true
}

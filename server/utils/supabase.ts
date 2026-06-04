import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { Database } from '~/types/database.types'

/**
 * Cliente de Supabase con la identidad del usuario de la petición.
 * Respeta las políticas RLS: solo ve/escribe datos permitidos para ese usuario.
 * Es el cliente por defecto para operaciones de datos en server routes.
 */
export function userClient(event: H3Event) {
  return serverSupabaseClient<Database>(event)
}

/**
 * Cliente de Supabase con SERVICE ROLE.
 *
 * ⚠️ OMITE RLS por completo. Reservado EXCLUSIVAMENTE para tareas
 * administrativas de plataforma (acciones de SUPER_ADMIN) dentro de server
 * routes. Este módulo vive en `server/` y se importa desde `#supabase/server`,
 * por lo que NUNCA llega al bundle del cliente. No reexportar hacia el cliente.
 */
export function serviceRoleClient(event: H3Event) {
  return serverSupabaseServiceRole<Database>(event)
}

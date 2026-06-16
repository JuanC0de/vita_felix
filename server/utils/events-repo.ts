import type { H3Event } from 'h3'
import { createError } from 'h3'
import { userClient } from './supabase'
import type {
  Event,
  EventStatus,
  EventThemeConfig,
  EventWithTiers,
  EventWriteModel,
  TicketTier,
  TierWriteModel,
} from '../../app/types/events'

/**
 * Acceso a datos de eventos y boletería. Usa el cliente con identidad del
 * usuario (`userClient`), por lo que el aislamiento por empresa y la
 * autorización por rol los aplica RLS en la base de datos, no este código
 * (req. 1.1, 1.3, 7.2). La autorización de feature por rol se verifica antes
 * en los server routes con `requireRole`.
 */

interface EventRow {
  id: string
  company_id: string
  name: string
  venue: string
  event_at: string
  status: EventStatus
  description: string | null
  flyer_url: string | null
  theme_config: EventThemeConfig | null
  created_at: string
  updated_at: string
}

interface TierRow {
  id: string
  event_id: string
  company_id: string
  name: string
  price: number | string
  currency: string
  quota: number
  entry_time_limit: string | null
  surcharge_amount: number | string
  created_at: string
  updated_at: string
}

const EVENT_COLUMNS = 'id, company_id, name, venue, event_at, status, description, flyer_url, theme_config, created_at, updated_at'
const TIER_COLUMNS = 'id, event_id, company_id, name, price, currency, quota, entry_time_limit, surcharge_amount, created_at, updated_at'

function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    venue: row.venue,
    eventAt: row.event_at,
    status: row.status,
    description: row.description,
    flyerUrl: row.flyer_url,
    themeConfig: row.theme_config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTier(row: TierRow): TicketTier {
  return {
    id: row.id,
    eventId: row.event_id,
    companyId: row.company_id,
    name: row.name,
    // numeric() puede llegar como string desde postgres; normalizamos a número.
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    currency: row.currency.trim(),
    quota: row.quota,
    entryTimeLimit: row.entry_time_limit ? row.entry_time_limit.substring(0, 5) : null,
    surchargeAmount: typeof row.surcharge_amount === 'string' ? Number(row.surcharge_amount) : row.surcharge_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function fail(message: string): never {
  throw createError({ statusCode: 500, statusMessage: message })
}

export async function listEvents(event: H3Event): Promise<Event[]> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .order('event_at', { ascending: false })
  if (error) fail('No se pudieron listar los eventos')
  return ((data ?? []) as unknown as EventRow[]).map(mapEvent)
}

export async function getEvent(event: H3Event, id: string): Promise<EventWithTiers | null> {
  const client = await userClient(event)
  const { data, error } = await client.from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle()
  if (error) fail('No se pudo obtener el evento')
  if (!data) return null
  const tiers = await listTiers(event, id)
  return { ...mapEvent(data as unknown as EventRow), tiers }
}

export async function insertEvent(
  event: H3Event,
  companyId: string,
  model: EventWriteModel,
): Promise<Event> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('events')
    .insert({
      company_id: companyId,
      name: model.name,
      venue: model.venue,
      event_at: model.eventAt,
      description: model.description,
      flyer_url: model.flyerUrl,
      theme_config: model.themeConfig as any,
    })
    .select(EVENT_COLUMNS)
    .single()
  if (error || !data) fail('No se pudo crear el evento')
  return mapEvent(data as unknown as EventRow)
}

export async function updateEvent(
  event: H3Event,
  id: string,
  model: EventWriteModel,
): Promise<Event | null> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('events')
    .update({
      name: model.name,
      venue: model.venue,
      event_at: model.eventAt,
      description: model.description,
      flyer_url: model.flyerUrl,
      theme_config: model.themeConfig as any,
    })
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle()
  if (error) fail('No se pudo actualizar el evento')
  return data ? mapEvent(data as unknown as EventRow) : null
}

export async function setEventStatus(
  event: H3Event,
  id: string,
  status: EventStatus,
): Promise<Event | null> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('events')
    .update({ status })
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .maybeSingle()
  if (error) fail('No se pudo actualizar el estado del evento')
  return data ? mapEvent(data as unknown as EventRow) : null
}

export async function deleteEvent(event: H3Event, id: string): Promise<boolean> {
  const client = await userClient(event)
  const { data, error } = await client.from('events').delete().eq('id', id).select('id')
  if (error) fail('No se pudo eliminar el evento')
  return ((data ?? []) as unknown[]).length > 0
}

export async function listTiers(event: H3Event, eventId: string): Promise<TicketTier[]> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('ticket_tiers')
    .select(TIER_COLUMNS)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
  if (error) fail('No se pudieron listar las etapas de boletería')
  return ((data ?? []) as unknown as TierRow[]).map(mapTier)
}

export async function createTier(
  event: H3Event,
  eventId: string,
  model: TierWriteModel,
): Promise<TicketTier> {
  const client = await userClient(event)
  // company_id lo fija el trigger desde el evento padre; enviamos un placeholder
  // que el trigger sobrescribe (req. 1.6).
  const { data, error } = await client
    .from('ticket_tiers')
    .insert({
      event_id: eventId,
      company_id: '00000000-0000-0000-0000-000000000000',
      name: model.name,
      price: model.price,
      currency: model.currency,
      quota: model.quota,
      entry_time_limit: model.entryTimeLimit,
      surcharge_amount: model.surchargeAmount,
    })
    .select(TIER_COLUMNS)
    .single()
  if (error || !data) fail('No se pudo crear la etapa de boletería')
  return mapTier(data as unknown as TierRow)
}

export async function updateTier(
  event: H3Event,
  eventId: string,
  tierId: string,
  model: TierWriteModel,
): Promise<TicketTier | null> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('ticket_tiers')
    .update({
      name: model.name,
      price: model.price,
      currency: model.currency,
      quota: model.quota,
      entry_time_limit: model.entryTimeLimit,
      surcharge_amount: model.surchargeAmount,
    })
    .eq('id', tierId)
    .eq('event_id', eventId)
    .select(TIER_COLUMNS)
    .maybeSingle()
  if (error) fail('No se pudo actualizar la etapa de boletería')
  return data ? mapTier(data as unknown as TierRow) : null
}

export async function deleteTier(event: H3Event, eventId: string, tierId: string): Promise<boolean> {
  const client = await userClient(event)
  const { data, error } = await client
    .from('ticket_tiers')
    .delete()
    .eq('id', tierId)
    .eq('event_id', eventId)
    .select('id')
  if (error) fail('No se pudo eliminar la etapa de boletería')
  return ((data ?? []) as unknown[]).length > 0
}

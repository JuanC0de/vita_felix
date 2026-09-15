-- 0024_courtesy_tier.sql
-- Separa las cortesías de las etapas de venta.
--
-- Antes, un anfitrión sin etapa asignada (tier_id null, "Cortesía (Por defecto)")
-- hacía que register_guest cayera al primer tier del evento — típicamente PREVENTA —
-- con lo cual la invitación gratuita quedaba etiquetada como una venta, consumía
-- aforo de preventa y sumaba su precio a los ingresos estimados del dashboard.
--
-- A partir de aquí cada evento tiene, bajo demanda, una etapa "Cortesía" propia:
-- precio 0, kind='courtesy', nunca listada en el formulario público de compra.

-- ─────────────────────────── 1) Esquema ───────────────────────────

-- Clasifica la etapa: 'sale' se vende al público, 'courtesy' solo se emite por
-- enlace de invitación.
alter table public.ticket_tiers
  add column if not exists kind text not null default 'sale';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ticket_tiers_kind_check'
  ) then
    alter table public.ticket_tiers
      add constraint ticket_tiers_kind_check check (kind in ('sale', 'courtesy'));
  end if;
end $$;

-- Marca el ticket individualmente: una cortesía emitida sobre una etapa de venta
-- (anfitrión con etapa explícita) sigue ocupando ese aforo, pero no es un ingreso.
alter table public.tickets
  add column if not exists is_courtesy boolean not null default false;

create index if not exists tickets_courtesy_idx on public.tickets (event_id, is_courtesy);

-- ─────────────────── 2) Normalizar datos existentes ───────────────────

-- 2.1) Etapas creadas a mano con nombre "cortesía" pasan a kind='courtesy'.
--      Si un evento tiene varias, solo la más antigua se convierte: el resto
--      permanece como etapa de venta para no romper el índice único de abajo.
with ranked as (
  select id,
         row_number() over (partition by event_id order by created_at asc) as rn
  from public.ticket_tiers
  where name ilike '%cortes%'
)
update public.ticket_tiers t
set kind = 'courtesy', price = 0
from ranked r
where t.id = r.id and r.rn = 1;

-- 2.2) Un solo tier de cortesía por evento.
create unique index if not exists ticket_tiers_one_courtesy_idx
  on public.ticket_tiers (event_id)
  where kind = 'courtesy';

-- 2.3) Todo ticket emitido por enlace de invitación es una cortesía.
update public.tickets t
set is_courtesy = true
from public.attendees a
where t.attendee_id = a.id
  and a.host_id is not null
  and t.is_courtesy = false;

-- ──────────────── 3) Resolución de la etapa de cortesía ────────────────

-- Devuelve (creando si hace falta) la etapa de cortesía del evento y mantiene su
-- cupo al día con el total de invitaciones repartidas entre anfitriones sin etapa
-- explícita. Nunca reduce el cupo por debajo de lo ya emitido.
create or replace function public.ensure_courtesy_tier(p_event_id uuid)
returns uuid as $$
declare
  v_tier_id uuid;
  v_company_id uuid;
  v_currency char(3);
  v_pledged integer;
  v_issued integer;
  v_quota integer;
begin
  select company_id into v_company_id from public.events where id = p_event_id;
  if v_company_id is null then
    raise exception 'El evento % no existe', p_event_id using errcode = 'P0002';
  end if;

  -- Cupo comprometido: invitados prometidos por anfitriones sin etapa asignada.
  select coalesce(sum(max_guests), 0) into v_pledged
  from public.event_hosts
  where event_id = p_event_id and tier_id is null;

  select id, currency into v_tier_id, v_currency
  from public.ticket_tiers
  where event_id = p_event_id and kind = 'courtesy'
  limit 1;

  if v_tier_id is not null then
    -- Nunca dejar el cupo por debajo de las cortesías ya emitidas.
    select count(*) into v_issued
    from public.tickets
    where tier_id = v_tier_id and status <> 'void';

    update public.ticket_tiers
    set quota = greatest(v_pledged, v_issued)
    where id = v_tier_id and quota <> greatest(v_pledged, v_issued);

    return v_tier_id;
  end if;

  -- Heredar la moneda de las etapas de venta del evento.
  select currency into v_currency
  from public.ticket_tiers
  where event_id = p_event_id
  order by created_at asc
  limit 1;

  v_quota := greatest(v_pledged, 1);

  insert into public.ticket_tiers (event_id, company_id, name, price, currency, quota, kind)
  values (p_event_id, v_company_id, 'Cortesía', 0, coalesce(v_currency, 'COP'), v_quota, 'courtesy')
  returning id into v_tier_id;

  return v_tier_id;
end;
$$ language plpgsql security definer;

-- ──────────────── 4) register_guest sin fallback a venta ────────────────

create or replace function public.register_guest(
  p_event_id uuid,
  p_token text,
  p_full_name text,
  p_email text,
  p_cedula_enc text,
  p_cedula_hash text
) returns uuid as $$
declare
  v_host_id uuid;
  v_company_id uuid;
  v_max_guests integer;
  v_current_guests integer;
  v_tier_id uuid;
  v_host_tier_id uuid;
  v_attendee_id uuid;
  v_ticket_id uuid;
begin
  -- 1. Obtener y bloquear la fila del anfitrión para evitar registros concurrentes
  select id, company_id, max_guests, tier_id into v_host_id, v_company_id, v_max_guests, v_host_tier_id
  from public.event_hosts
  where event_id = p_event_id and token = p_token
  for update;

  if v_host_id is null then
    raise exception 'Enlace de invitación no válido.' using errcode = 'P0002';
  end if;

  -- 2. Validar cupos actuales
  select count(*) into v_current_guests
  from public.attendees
  where host_id = v_host_id;

  if v_current_guests >= v_max_guests then
    raise exception 'Las invitaciones para este enlace se han agotado.' using errcode = 'P0003';
  end if;

  -- 3. Determinar la categoría (tier) de boleta a emitir.
  --    Sin etapa explícita se usa la etapa de cortesía del evento; ya no se cae
  --    al primer tier disponible, que hacía pasar la invitación por una venta.
  if v_host_tier_id is not null then
    v_tier_id := v_host_tier_id;
  else
    v_tier_id := public.ensure_courtesy_tier(p_event_id);
  end if;

  -- 4. Insertar asistente
  insert into public.attendees (company_id, event_id, full_name, email, cedula_enc, cedula_hash, host_id)
  values (v_company_id, p_event_id, p_full_name, p_email, p_cedula_enc, p_cedula_hash, v_host_id)
  returning id into v_attendee_id;

  -- 5. Crear ticket — siempre marcado como cortesía: no genera ingreso
  insert into public.tickets (company_id, event_id, tier_id, attendee_id, status, is_courtesy)
  values (v_company_id, p_event_id, v_tier_id, v_attendee_id, 'valid', true)
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$ language plpgsql security definer;

-- ────────── 5) Reubicar cortesías ya emitidas sobre etapas de venta ──────────

-- Las invitaciones registradas antes de esta migración quedaron en la etapa que
-- el fallback eligió (la primera del evento). Solo se mueven las de anfitriones
-- sin etapa explícita: quien asignó una etapa a propósito la conserva.
-- Los PDF ya generados conservan el rótulo antiguo; se regeneran aparte con
-- scripts/backfill-courtesy-tickets.js (el QR no cambia: se firma sobre el id).
do $$
declare
  v_event_id uuid;
  v_tier_id uuid;
begin
  for v_event_id in
    select distinct t.event_id
    from public.tickets t
    join public.attendees a on a.id = t.attendee_id
    join public.event_hosts h on h.id = a.host_id
    join public.ticket_tiers tt on tt.id = t.tier_id
    where h.tier_id is null and tt.kind <> 'courtesy'
  loop
    v_tier_id := public.ensure_courtesy_tier(v_event_id);

    update public.tickets t
    set tier_id = v_tier_id
    from public.attendees a, public.event_hosts h
    where t.attendee_id = a.id
      and a.host_id = h.id
      and h.tier_id is null
      and t.event_id = v_event_id
      and t.tier_id <> v_tier_id;
  end loop;
end $$;

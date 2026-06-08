-- 0017_guest_list_invitations.sql
-- Implementación del sistema de lista de invitados y cortesías atómicas.

-- 1) Crear la tabla event_hosts para registrar DJs, socios y promotores
create table if not exists public.event_hosts (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  event_id            uuid not null references public.events(id) on delete cascade,
  tier_id             uuid references public.ticket_tiers(id) on delete set null,
  name                text not null check (length(btrim(name)) > 0),
  role                text not null default 'PR',
  max_guests          integer not null check (max_guests > 0),
  token               text not null default encode(gen_random_bytes(16), 'hex'),
  created_at          timestamptz not null default now(),
  unique (event_id, token)
);

-- Crear índices de búsqueda rápida
create index if not exists event_hosts_company_idx on public.event_hosts (company_id, event_id);
create index if not exists event_hosts_token_idx on public.event_hosts (event_id, token);

-- 2) Alterar la tabla attendees para agregar host_id
alter table public.attendees 
  add column if not exists host_id uuid references public.event_hosts(id) on delete set null;

create index if not exists attendees_host_idx on public.attendees (host_id);

-- 3) Habilitar RLS en la tabla event_hosts
alter table public.event_hosts enable row level security;
alter table public.event_hosts force row level security;

-- Otorgar privilegios base
grant select, insert, update, delete on public.event_hosts to authenticated;

-- Políticas de RLS
create policy event_hosts_select on public.event_hosts
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

create policy event_hosts_insert on public.event_hosts
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

create policy event_hosts_update on public.event_hosts
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  )
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

create policy event_hosts_delete on public.event_hosts
  for delete to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) = 'COMPANY_ADMIN'
    )
  );

-- 4) Crear función SQL register_guest para transacciones atómicas
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

  -- 3. Determinar la categoría (tier) de boleta a emitir
  if v_host_tier_id is not null then
    v_tier_id := v_host_tier_id;
  else
    -- Fallback 1: Buscar tier que contenga "cortes" en el nombre (ej. Cortesía, cortesia)
    select id into v_tier_id
    from public.ticket_tiers
    where event_id = p_event_id and name ilike '%cortes%'
    limit 1;

    -- Fallback 2: Tomar el primer tier disponible si no hay uno llamado "cortesia"
    if v_tier_id is null then
      select id into v_tier_id
      from public.ticket_tiers
      where event_id = p_event_id
      limit 1;
    end if;
  end if;
  
  if v_tier_id is null then
    raise exception 'No se encontró una categoría de boleta disponible en el evento.' using errcode = 'P0004';
  end if;

  -- 4. Insertar asistente
  insert into public.attendees (company_id, event_id, full_name, email, cedula_enc, cedula_hash, host_id)
  values (v_company_id, p_event_id, p_full_name, p_email, p_cedula_enc, p_cedula_hash, v_host_id)
  returning id into v_attendee_id;

  -- 5. Crear ticket
  insert into public.tickets (company_id, event_id, tier_id, attendee_id, status)
  values (v_company_id, p_event_id, v_tier_id, v_attendee_id, 'valid')
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$ language plpgsql security definer;

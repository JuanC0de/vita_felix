-- 0010_ticketing_rls.sql
-- RLS de attendees/tickets/checkins + función atómica de check-in.
--
-- Política de roles (la autorización primaria es server-side; esto es defensa
-- en profundidad a nivel DB):
--   - SELECT: usuario autenticado de la empresa (o SUPER_ADMIN) (req. 2.3, 2.4, 2.5).
--   - tickets UPDATE (check-in): GATE_STAFF o COMPANY_ADMIN de la empresa (req. 5,6).
--   - checkins INSERT (auditoría): GATE_STAFF o COMPANY_ADMIN de la empresa.
--   - El INSERT de attendees/tickets NO tiene política para `authenticated`: el
--     registro público se hace con SERVICE ROLE server-side (anon no pasa RLS),
--     fijando company_id desde el evento (req. 1.5).

alter table public.attendees enable row level security;
alter table public.attendees force  row level security;
alter table public.tickets   enable row level security;
alter table public.tickets   force  row level security;
alter table public.checkins  enable row level security;
alter table public.checkins  force  row level security;

grant select on public.attendees to authenticated;
grant select, update on public.tickets to authenticated;
grant select, insert on public.checkins to authenticated;

-- ─────────────────────────────── attendees ───────────────────────────────
create policy attendees_select on public.attendees
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

-- ──────────────────────────────── tickets ─────────────────────────────────
create policy tickets_select on public.tickets
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

-- UPDATE solo para check-in en puerta: GATE_STAFF o COMPANY_ADMIN de la empresa.
create policy tickets_update on public.tickets
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('GATE_STAFF', 'COMPANY_ADMIN')
    )
  )
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('GATE_STAFF', 'COMPANY_ADMIN')
    )
  );

-- ──────────────────────────────── checkins ────────────────────────────────
create policy checkins_select on public.checkins
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

create policy checkins_insert on public.checkins
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('GATE_STAFF', 'COMPANY_ADMIN')
    )
  );

-- ──────────────────────── check-in atómico (núcleo 6.x) ────────────────────────
-- SECURITY INVOKER: corre bajo el RLS del usuario que valida → el aislamiento por
-- empresa lo impone RLS. El UPDATE condicional (status='valid') es atómico a nivel
-- de fila: bajo concurrencia, Postgres serializa las escrituras y solo UNA observa
-- 'valid'; la otra afecta 0 filas (exactamente-un-uso, req. 6.1, 6.3). Incluye la
-- revocación por evento cancelado (req. 6.4) y registra auditoría (req. 6.5).
create or replace function public.checkin_ticket(p_ticket_id uuid)
returns table (result text, used_at timestamptz, full_name text, tier_name text)
language plpgsql
security invoker
as $$
declare
  v_ticket       public.tickets;
  v_event_status public.event_status;
begin
  update public.tickets t
     set status = 'used', used_at = now()
   where t.id = p_ticket_id
     and t.status = 'valid'
     and exists (
       select 1 from public.events e
        where e.id = t.event_id and e.status <> 'cancelled'
     )
  returning t.* into v_ticket;

  if found then
    insert into public.checkins (company_id, ticket_id, scanned_by, result)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'admitted');
    return query
      select 'admitted'::text, v_ticket.used_at, a.full_name, tt.name
        from public.attendees a
        join public.ticket_tiers tt on tt.id = v_ticket.tier_id
       where a.id = v_ticket.attendee_id;
    return;
  end if;

  -- No se actualizó: clasificar el motivo. La lectura respeta RLS, por lo que un
  -- ticket de otra empresa no es visible → not_found (req. 5.4).
  select * into v_ticket from public.tickets where id = p_ticket_id;
  if not found then
    return query select 'invalid:not_found'::text, null::timestamptz, null::text, null::text;
    return;
  end if;

  select e.status into v_event_status from public.events e where e.id = v_ticket.event_id;

  if v_ticket.status = 'used' then
    insert into public.checkins (company_id, ticket_id, scanned_by, result)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'already_used');
    return query select 'already_used'::text, v_ticket.used_at, null::text, null::text;
  elsif v_event_status = 'cancelled' then
    insert into public.checkins (company_id, ticket_id, scanned_by, result)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'invalid:event_cancelled');
    return query select 'invalid:event_cancelled'::text, null::timestamptz, null::text, null::text;
  else
    insert into public.checkins (company_id, ticket_id, scanned_by, result)
      values (v_ticket.company_id, v_ticket.id, auth.uid(), 'invalid:void');
    return query select 'invalid:void'::text, null::timestamptz, null::text, null::text;
  end if;
end;
$$;

grant execute on function public.checkin_ticket(uuid) to authenticated;

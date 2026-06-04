-- =============================================================================
-- CONSOLIDADO: ticketing-checkin (0009 + 0010 + 0011)
-- Pegar en Supabase Dashboard → SQL Editor → Run
-- Idempotente parcial: 0011 usa ON CONFLICT; 0009/0010 fallan si ya existen.
-- =============================================================================

-- ─── 0009_ticketing.sql ───
create type public.ticket_status as enum ('valid', 'used', 'void');

create table public.attendees (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) > 0),
  email       text not null check (position('@' in email) > 1),
  cedula_enc  text not null,
  cedula_hash text not null,
  created_at  timestamptz not null default now(),
  unique (event_id, cedula_hash)
);

create index attendees_company_idx on public.attendees (company_id, event_id);

create table public.tickets (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  tier_id     uuid not null references public.ticket_tiers(id) on delete restrict,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  status      public.ticket_status not null default 'valid',
  used_at     timestamptz,
  pdf_path    text,
  created_at  timestamptz not null default now()
);

create index tickets_company_idx on public.tickets (company_id, event_id);
create index tickets_event_idx   on public.tickets (event_id);

create table public.checkins (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  ticket_id   uuid references public.tickets(id) on delete set null,
  scanned_by  uuid references auth.users(id) on delete set null,
  result      text not null,
  created_at  timestamptz not null default now()
);

create index checkins_ticket_idx  on public.checkins (ticket_id);
create index checkins_company_idx on public.checkins (company_id, created_at);

-- ─── 0010_ticketing_rls.sql ───
alter table public.attendees enable row level security;
alter table public.attendees force  row level security;
alter table public.tickets   enable row level security;
alter table public.tickets   force  row level security;
alter table public.checkins  enable row level security;
alter table public.checkins  force  row level security;

grant select on public.attendees to authenticated;
grant select, update on public.tickets to authenticated;
grant select, insert on public.checkins to authenticated;

create policy attendees_select on public.attendees
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

create policy tickets_select on public.tickets
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

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

-- ─── 0011_storage_tickets.sql ───
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;

create policy "tickets_read_own_company" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tickets'
    and exists (
      select 1 from public.tickets t
      where t.pdf_path = storage.objects.name
        and (
          (select public.is_super_admin())
          or t.company_id = (select public.auth_company_id())
        )
    )
  );

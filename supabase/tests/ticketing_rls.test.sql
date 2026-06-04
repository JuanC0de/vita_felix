-- ticketing_rls.test.sql
-- Pruebas de integración de attendees/tickets/checkins: aislamiento multi-tenant
-- + check-in atómico (exactamente-un-uso) + revocación. Se ejecuta DESPUÉS de
-- events_rls.test.sql (reutiliza empresas A/B y usuarios 1111/2222/4444/9999).
-- Cubre req. 1.4, 2.3, 2.4, 2.5, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5.

grant select, insert, update, delete on public.attendees, public.tickets, public.checkins to anon;

-- ── Semilla (como owner, omite RLS: simula el registro con SERVICE ROLE) ──
reset role;

-- Tiers explícitos (el trigger fija company_id desde el evento).
insert into public.ticket_tiers (id, event_id, company_id, name, price, currency, quota) values
  ('cc000001-0000-0000-0000-000000000001', 'e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'General A', 100, 'COP', 100),
  ('cc000002-0000-0000-0000-000000000002', 'eb111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'General B', 100, 'COP', 100);

-- Evento cancelado de la empresa A (para la prueba de revocación).
insert into public.events (id, company_id, name, venue, event_at, status) values
  ('ce000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cancelado A', 'Lugar A', now(), 'cancelled');

-- Asistentes (cédula cifrada simulada + hash).
insert into public.attendees (id, company_id, event_id, full_name, email, cedula_enc, cedula_hash) values
  ('ca000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e2222222-2222-2222-2222-222222222222', 'Asistente A', 'a@a.com', 'enc', 'hashA1'),
  ('ca000002-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eb111111-1111-1111-1111-111111111111', 'Asistente B', 'b@b.com', 'enc', 'hashB1');

-- Tickets: válido(A), anulado(A), válido(A en evento cancelado), válido(B).
insert into public.tickets (id, company_id, event_id, tier_id, attendee_id, status) values
  ('cf000001-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e2222222-2222-2222-2222-222222222222', 'cc000001-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'valid'),
  ('cf000002-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e2222222-2222-2222-2222-222222222222', 'cc000001-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'void'),
  ('cf000003-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ce000001-0000-0000-0000-000000000001', 'cc000001-0000-0000-0000-000000000001', 'ca000001-0000-0000-0000-000000000001', 'valid'),
  ('cf000004-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eb111111-1111-1111-1111-111111111111', 'cc000002-0000-0000-0000-000000000002', 'ca000002-0000-0000-0000-000000000002', 'valid');

-- ── Test T0: dedup — segunda cédula igual en el mismo evento viola UNIQUE (req. 1.4) ──
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.attendees (company_id, event_id, full_name, email, cedula_enc, cedula_hash)
      values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e2222222-2222-2222-2222-222222222222', 'Dup', 'd@a.com', 'enc', 'hashA1');
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'TEST T0 FALLO: se permitió cédula duplicada en el evento'; end if;
end $$;

-- ── Test T1: aislamiento — Empresa B no ve tickets/attendees de A (req. 2.3, 2.4) ──
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"company_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"EVENT_MANAGER"}}', false);
do $$
begin
  if (select count(*) from public.tickets where company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'TEST T1 FALLO: Empresa B ve tickets de Empresa A';
  end if;
  if (select count(*) from public.attendees where company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'TEST T1 FALLO: Empresa B ve asistentes de Empresa A';
  end if;
end $$;

-- ── Test T2: GATE_STAFF de A hace check-in admitido (req. 6.1) ──
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"GATE_STAFF"}}', false);
do $$
declare r text;
begin
  select result into r from public.checkin_ticket('cf000001-0000-0000-0000-000000000001');
  if r <> 'admitted' then raise exception 'TEST T2 FALLO: esperaba admitted, obtuvo %', r; end if;
  if (select status from public.tickets where id = 'cf000001-0000-0000-0000-000000000001') <> 'used' then
    raise exception 'TEST T2 FALLO: el ticket no quedó como usado';
  end if;
  if (select used_at from public.tickets where id = 'cf000001-0000-0000-0000-000000000001') is null then
    raise exception 'TEST T2 FALLO: used_at quedó nulo';
  end if;
end $$;

-- ── Test T3: segundo intento del mismo ticket → already_used (req. 6.2, 6.3) ──
do $$
declare r text;
begin
  select result into r from public.checkin_ticket('cf000001-0000-0000-0000-000000000001');
  if r <> 'already_used' then raise exception 'TEST T3 FALLO: esperaba already_used, obtuvo %', r; end if;
end $$;

-- ── Test T4: ticket anulado → invalid:void (req. 6.4) ──
do $$
declare r text;
begin
  select result into r from public.checkin_ticket('cf000002-0000-0000-0000-000000000002');
  if r <> 'invalid:void' then raise exception 'TEST T4 FALLO: esperaba invalid:void, obtuvo %', r; end if;
end $$;

-- ── Test T5: evento cancelado → invalid:event_cancelled y NO se marca usado (req. 6.4) ──
do $$
declare r text;
begin
  select result into r from public.checkin_ticket('cf000003-0000-0000-0000-000000000003');
  if r <> 'invalid:event_cancelled' then raise exception 'TEST T5 FALLO: esperaba invalid:event_cancelled, obtuvo %', r; end if;
  if (select status from public.tickets where id = 'cf000003-0000-0000-0000-000000000003') <> 'valid' then
    raise exception 'TEST T5 FALLO: un evento cancelado marcó el ticket como usado';
  end if;
end $$;

-- ── Test T6: ticket de otra empresa → invalid:not_found (RLS oculta) (req. 5.4) ──
do $$
declare r text;
begin
  select result into r from public.checkin_ticket('cf000004-0000-0000-0000-000000000004');
  if r <> 'invalid:not_found' then raise exception 'TEST T6 FALLO: esperaba invalid:not_found, obtuvo %', r; end if;
end $$;

-- ── Test T7: auditoría registrada para la empresa A (req. 6.5) ──
do $$
begin
  if (select count(*) from public.checkins where result = 'admitted'
        and company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') < 1 then
    raise exception 'TEST T7 FALLO: no se registró la auditoría del check-in admitido';
  end if;
end $$;
reset role;

-- ── Test T6b: como owner, el ticket de B sigue válido (no fue alterado) (req. 5.4) ──
do $$
begin
  if (select status from public.tickets where id = 'cf000004-0000-0000-0000-000000000004') <> 'valid' then
    raise exception 'TEST T6b FALLO: se alteró un ticket de otra empresa';
  end if;
end $$;

select '✔ Todas las pruebas RLS/atomicidad de ticketing pasaron' as resultado;

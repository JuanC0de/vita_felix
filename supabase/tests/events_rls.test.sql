-- events_rls.test.sql
-- Pruebas de integración RLS de events y ticket_tiers: aislamiento multi-tenant
-- + defensa en profundidad por rol. Se ejecuta DESPUÉS de rls_isolation.test.sql
-- (reutiliza las empresas A/B y los usuarios 1111/2222/9999 ya insertados).
-- Cubre req. 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3.

grant select, insert, update, delete on public.events, public.ticket_tiers to anon;

-- Usuarios adicionales de la Empresa A: un EVENT_MANAGER y un GATE_STAFF.
insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'mgrA@empresaA.com'),
  ('44444444-4444-4444-4444-444444444444', 'gateA@empresaA.com');

insert into public.profiles (id, company_id, role, full_name) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'EVENT_MANAGER', 'Mgr A'),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GATE_STAFF', 'Gate A');

-- ── Test E1: COMPANY_ADMIN de A crea un evento de A (req. 1.5, 2.1) ──
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"COMPANY_ADMIN"}}', false);
do $$
begin
  insert into public.events (id, company_id, name, venue, event_at)
    values ('e1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Concierto A1', 'Lugar A', now());
  if (select count(*) from public.events where id = 'e1111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'TEST E1 FALLO: COMPANY_ADMIN no pudo crear su evento';
  end if;
end $$;

-- ── Test E2: EVENT_MANAGER de A crea un evento de A (req. 2.2) ──
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"EVENT_MANAGER"}}', false);
do $$
begin
  insert into public.events (id, company_id, name, venue, event_at)
    values ('e2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Concierto A2', 'Lugar A', now());
  if (select count(*) from public.events where id = 'e2222222-2222-2222-2222-222222222222') <> 1 then
    raise exception 'TEST E2 FALLO: EVENT_MANAGER no pudo crear evento';
  end if;
end $$;

-- ── Test E3: GATE_STAFF de A NO puede crear eventos (req. 2.3) ──
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"GATE_STAFF"}}', false);
do $$
begin
  begin
    insert into public.events (company_id, name, venue, event_at)
      values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hack', 'x', now());
    raise exception 'TEST E3 FALLO: GATE_STAFF pudo crear un evento (RLS no bloqueó)';
  exception when insufficient_privilege then null; -- esperado
  end;
end $$;

-- ── Test E4: aislamiento — Empresa B no ve eventos de Empresa A (req. 1.1, 1.2) ──
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"company_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"EVENT_MANAGER"}}', false);
do $$
begin
  if (select count(*) from public.events where company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'TEST E4 FALLO: Empresa B ve eventos de Empresa A';
  end if;
end $$;

-- B crea su propio evento (para las pruebas de tier cross-company).
do $$
begin
  insert into public.events (id, company_id, name, venue, event_at)
    values ('eb111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Concierto B1', 'Lugar B', now());
end $$;

-- ── Test E5: EVENT_MANAGER de A NO puede eliminar eventos (req. 2.2) ──
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"EVENT_MANAGER"}}', false);
do $$
declare cnt int;
begin
  with d as (delete from public.events where id = 'e1111111-1111-1111-1111-111111111111' returning id)
  select count(*) into cnt from d;
  if cnt <> 0 then
    raise exception 'TEST E5 FALLO: EVENT_MANAGER pudo eliminar un evento';
  end if;
  if (select count(*) from public.events where id = 'e1111111-1111-1111-1111-111111111111') <> 1 then
    raise exception 'TEST E5 FALLO: el evento desapareció tras un DELETE no autorizado';
  end if;
end $$;

-- ── Test E6: COMPANY_ADMIN de A SÍ puede eliminar su evento (req. 2.2, 3.5) ──
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"COMPANY_ADMIN"}}', false);
do $$
declare cnt int;
begin
  with d as (delete from public.events where id = 'e1111111-1111-1111-1111-111111111111' returning id)
  select count(*) into cnt from d;
  if cnt <> 1 then
    raise exception 'TEST E6 FALLO: COMPANY_ADMIN no pudo eliminar su evento';
  end if;
end $$;

-- ── Test E7: el tier hereda la empresa del evento (req. 1.6) ──
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"EVENT_MANAGER"}}', false);
do $$
begin
  -- company_id placeholder; el trigger lo sobrescribe con la empresa del evento.
  insert into public.ticket_tiers (event_id, company_id, name, price, currency, quota)
    values ('e2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'General', 100, 'COP', 50);
  if (select company_id from public.ticket_tiers where event_id = 'e2222222-2222-2222-2222-222222222222' limit 1)
     <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception 'TEST E7 FALLO: el tier no heredó la empresa del evento';
  end if;
end $$;

-- ── Test E8: no se puede crear un tier en un evento de otra empresa (req. 1.6) ──
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.ticket_tiers (event_id, company_id, name, price, currency, quota)
      values ('eb111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'hack', 1, 'COP', 1);
  exception when others then rejected := true; -- RLS oculta el evento de B → rechazo
  end;
  if not rejected then
    raise exception 'TEST E8 FALLO: se pudo crear un tier en un evento de otra empresa';
  end if;
  if (select count(*) from public.ticket_tiers where event_id = 'eb111111-1111-1111-1111-111111111111') <> 0 then
    raise exception 'TEST E8 FALLO: quedó un tier en el evento de otra empresa';
  end if;
end $$;
reset role;

-- ── Test E9: SUPER_ADMIN ve todos los eventos (req. 1.4) ──
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"company_id":null,"role":"SUPER_ADMIN"}}', false);
do $$
begin
  -- Estado esperado: A1 eliminado, quedan A2 (empresa A) y B1 (empresa B) = 2.
  if (select count(*) from public.events) <> 2 then
    raise exception 'TEST E9 FALLO: SUPER_ADMIN debería ver 2 eventos, vio %',
      (select count(*) from public.events);
  end if;
end $$;
reset role;

select '✔ Todas las pruebas RLS de events/ticket_tiers pasaron' as resultado;

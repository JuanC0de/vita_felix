-- rls_isolation.test.sql
-- Pruebas de integración del aislamiento multi-tenant (RLS) y del Custom Access
-- Token Hook. Cada aserción aborta la transacción con RAISE EXCEPTION si falla,
-- por lo que el script completo falla (ON_ERROR_STOP) ante cualquier regresión.
-- Cubre req. 1.1, 1.2, 1.4, 1.5, 4.3, 7.1.

-- Permitir que el rol authenticated ejecute los helpers (en Supabase ya viene por defecto).
grant execute on function public.auth_company_id(), public.auth_role(), public.is_super_admin() to authenticated, anon;
-- Otorgar SELECT a anon para verificar que RLS (políticas solo `to authenticated`)
-- devuelve 0 filas, no un error de privilegios.
grant select on public.profiles, public.companies to anon;

-- ── Datos de prueba (insertados como superusuario; bypassa RLS) ──
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@empresaA.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@empresaB.com'),
  ('99999999-9999-9999-9999-999999999999', 'sa@plataforma.com');

insert into public.companies (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Empresa A', 'empresa-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Empresa B', 'empresa-b');

insert into public.profiles (id, company_id, role, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'COMPANY_ADMIN', 'Admin A'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'EVENT_MANAGER', 'Mgr B'),
  ('99999999-9999-9999-9999-999999999999', null, 'SUPER_ADMIN', 'Super');

-- ── Test 1: el hook inyecta company_id y role en app_metadata (req. 4.3) ──
do $$
declare m jsonb;
begin
  m := public.custom_access_token_hook(
        '{"user_id":"11111111-1111-1111-1111-111111111111","claims":{}}'::jsonb)
        -> 'claims' -> 'app_metadata';
  if m ->> 'role' <> 'COMPANY_ADMIN' or m ->> 'company_id' <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
    raise exception 'TEST 1 FALLO: hook no inyectó los claims esperados: %', m;
  end if;
end $$;

-- ── Test 2: usuario sin perfil no recibe app_metadata (req. 4.4) ──
do $$
begin
  if (public.custom_access_token_hook(
        '{"user_id":"00000000-0000-0000-0000-000000000000","claims":{}}'::jsonb)
        -> 'claims' -> 'app_metadata') is not null then
    raise exception 'TEST 2 FALLO: usuario sin perfil recibió app_metadata';
  end if;
end $$;

-- ── Test 3: aislamiento de lectura — Empresa A no ve datos de Empresa B (req. 1.1, 1.2) ──
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"company_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"COMPANY_ADMIN"}}',
  false);
do $$
begin
  if (select count(*) from public.profiles where company_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') <> 0 then
    raise exception 'TEST 3 FALLO: Empresa A puede ver perfiles de Empresa B';
  end if;
  if (select count(*) from public.companies) <> 1 then
    raise exception 'TEST 3 FALLO: Empresa A debería ver exactamente 1 empresa (la propia)';
  end if;
end $$;

-- ── Test 4: aislamiento de escritura — Empresa A no puede crear empresas (req. 1.2) ──
do $$
begin
  begin
    insert into public.companies (name, slug) values ('hack', 'hack-slug');
    raise exception 'TEST 4 FALLO: Empresa A pudo insertar una empresa (RLS no bloqueó)';
  exception
    when insufficient_privilege then null; -- esperado: violación de política RLS
  end;
end $$;
reset role;

-- ── Test 5: SUPER_ADMIN ve todo (req. 1.4) ──
set role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"company_id":null,"role":"SUPER_ADMIN"}}',
  false);
do $$
begin
  if (select count(*) from public.profiles) <> 3 then
    raise exception 'TEST 5 FALLO: SUPER_ADMIN debería ver 3 perfiles';
  end if;
  if (select count(*) from public.companies) <> 2 then
    raise exception 'TEST 5 FALLO: SUPER_ADMIN debería ver 2 empresas';
  end if;
end $$;
reset role;

-- ── Test 6: sin identidad (anon) no ve filas (req. 1.5) ──
set role anon;
select set_config('request.jwt.claims', '', false);
do $$
begin
  if (select count(*) from public.profiles) <> 0 then
    raise exception 'TEST 6 FALLO: anon obtuvo filas de profiles';
  end if;
end $$;
reset role;

select '✔ Todas las pruebas de aislamiento RLS y hook pasaron' as resultado;

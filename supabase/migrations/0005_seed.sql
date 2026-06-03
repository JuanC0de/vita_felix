-- 0005_seed.sql
-- Datos semilla mínimos para habilitar pruebas de extremo a extremo:
-- una empresa de ejemplo y un usuario SUPER_ADMIN que puede autenticarse.
-- Idempotente: puede re-ejecutarse sin duplicar datos.
--
-- NOTA: crear usuarios por SQL es válido para semillas/entornos de desarrollo.
-- En producción los usuarios se aprovisionan vía Supabase Auth (no por SQL).
-- La contraseña por defecto debe cambiarse tras el primer acceso.

-- Empresa de ejemplo.
insert into public.companies (id, name, slug)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Empresa Demo', 'empresa-demo')
on conflict (slug) do nothing;

-- Usuario SUPER_ADMIN + su perfil (idempotente por email).
do $$
declare
  v_user_id uuid;
  v_email   text := 'superadmin@vitafelix.local';
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      -- GoTrue lee estas columnas como string; deben ser '' (no NULL) o el login
      -- falla con "Database error querying schema".
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      crypt('ChangeMe123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', '', '', '', '', ''
    );
  end if;

  -- Perfil SUPER_ADMIN (company_id NULL = acceso transversal).
  insert into public.profiles (id, company_id, role, full_name)
  values (v_user_id, null, 'SUPER_ADMIN', 'Super Admin')
  on conflict (id) do update set role = excluded.role;
end $$;

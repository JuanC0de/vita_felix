-- 0004_access_token_hook.sql
-- Custom Access Token Hook: Supabase Auth invoca esta función ANTES de emitir el
-- JWT. Inyecta company_id y role del perfil del usuario en claims.app_metadata.
-- Si el usuario no tiene perfil habilitado, no inyecta esos claims (consumido por
-- la regla 4.4: cuenta no habilitada).
--
-- Activación (no se hace por SQL): en Supabase Dashboard → Authentication → Hooks
-- → "Custom Access Token", seleccionar public.custom_access_token_hook.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims        jsonb;
  v_company_id  uuid;
  v_role        public.app_role;
begin
  select p.company_id, p.role
    into v_company_id, v_role
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_role is not null then
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      coalesce(claims -> 'app_metadata', '{}'::jsonb)
        || jsonb_build_object('company_id', v_company_id, 'role', v_role)
    );
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- El hook lo ejecuta el rol interno supabase_auth_admin; el resto no debe verlo.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

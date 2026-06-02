-- 0002_rls_helpers.sql
-- Funciones helper que derivan empresa y rol del usuario desde los claims del JWT
-- (app_metadata). Se usan dentro de las políticas RLS envueltas en (select ...)
-- para que Postgres las evalúe una vez por consulta (InitPlan) y no por fila.
--
-- IMPORTANTE: leen SIEMPRE de app_metadata (solo escribible del lado servidor),
-- nunca de user_metadata (modificable por el usuario).

-- Empresa del usuario autenticado (NULL para SUPER_ADMIN o sin claim).
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid
$$;

-- Rol del usuario autenticado (NULL si no hay claim de rol).
create or replace function public.auth_role()
returns public.app_role
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.app_role
$$;

-- ¿El usuario autenticado es SUPER_ADMIN? (acceso transversal a todas las empresas).
create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN'
$$;

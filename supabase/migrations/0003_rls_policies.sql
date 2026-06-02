-- 0003_rls_policies.sql
-- Aislamiento multi-tenant a nivel de base de datos. RLS habilitado y FORZADO
-- (force = aplica incluso al dueño de la tabla; solo el service role con BYPASSRLS
-- lo omite). Todas las políticas son `to authenticated`: sin sesión válida no hay filas.
--
-- Patrón reutilizable por las tablas de otras especificaciones:
--   - lectura/escritura aisladas por empresa con (select public.auth_company_id())
--   - acceso transversal de SUPER_ADMIN con (select public.is_super_admin())
--   - helpers envueltos en (select ...) para cachear vía InitPlan.

alter table public.companies enable row level security;
alter table public.companies force row level security;
alter table public.profiles  enable row level security;
alter table public.profiles  force row level security;

-- Privilegios base (RLS sigue filtrando por encima de estos grants).
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.profiles  to authenticated;

-- ─────────────────────────── companies ───────────────────────────
-- Lectura: la propia empresa; SUPER_ADMIN ve todas.
create policy companies_select on public.companies
  for select to authenticated
  using (
    (select public.is_super_admin())
    or id = (select public.auth_company_id())
  );

-- Escritura: solo SUPER_ADMIN (aprovisionamiento de plataforma).
create policy companies_insert on public.companies
  for insert to authenticated
  with check ((select public.is_super_admin()));

create policy companies_update on public.companies
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create policy companies_delete on public.companies
  for delete to authenticated
  using ((select public.is_super_admin()));

-- ─────────────────────────── profiles ───────────────────────────
-- Lectura: el propio perfil, los perfiles de la misma empresa, o todos si SUPER_ADMIN.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (select public.is_super_admin())
    or id = (select auth.uid())
    or company_id = (select public.auth_company_id())
  );

-- Escritura: solo SUPER_ADMIN en esta fundación (la gestión de usuarios por
-- COMPANY_ADMIN queda fuera de alcance; ver design.md Non-Goals).
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check ((select public.is_super_admin()));

create policy profiles_update on public.profiles
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using ((select public.is_super_admin()));

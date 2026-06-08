-- 0015_fix_super_admin_tenant_select.sql
-- Actualiza las políticas de selección RLS de las tablas principales.
-- Si un usuario con rol SUPER_ADMIN tiene un claim company_id activo (no nulo) en su JWT,
-- las políticas de selección filtrarán por dicho identificador.
-- Si el identificador es nulo, se permitirá el acceso global y transversal.

-- 1) companies
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or id = (select public.auth_company_id())
  );

-- 2) profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or id = (select auth.uid())
    or company_id = (select public.auth_company_id())
  );

-- 3) user_companies
drop policy if exists user_companies_select on public.user_companies;
create policy user_companies_select on public.user_companies
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or user_id = (select auth.uid())
    or company_id = (select public.auth_company_id())
  );

-- 4) events
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or company_id = (select public.auth_company_id())
  );

-- 5) ticket_tiers
drop policy if exists ticket_tiers_select on public.ticket_tiers;
create policy ticket_tiers_select on public.ticket_tiers
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or company_id = (select public.auth_company_id())
  );

-- 6) attendees
drop policy if exists attendees_select on public.attendees;
create policy attendees_select on public.attendees
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or company_id = (select public.auth_company_id())
  );

-- 7) tickets
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or company_id = (select public.auth_company_id())
  );

-- 8) checkins
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins
  for select to authenticated
  using (
    (
      (select public.is_super_admin())
      and (select public.auth_company_id()) is null
    )
    or company_id = (select public.auth_company_id())
  );

-- 0008_events_rls.sql
-- Aislamiento multi-tenant + defensa en profundidad por rol para events y
-- ticket_tiers. Reutiliza los helpers de la foundation (auth_company_id,
-- auth_role, is_super_admin) envueltos en (select ...) para cachear vía InitPlan.
--
-- Política de roles (la autorización primaria es server-side; esto es defensa
-- en profundidad a nivel DB):
--   - SELECT: cualquier usuario autenticado de la empresa (o SUPER_ADMIN).
--   - INSERT/UPDATE eventos y tiers: COMPANY_ADMIN o EVENT_MANAGER de la empresa.
--   - DELETE de EVENTOS: solo COMPANY_ADMIN (EVENT_MANAGER no elimina) (req. 2.2).
--   - DELETE de TIERS: COMPANY_ADMIN o EVENT_MANAGER (req. 5.4).

alter table public.events       enable row level security;
alter table public.events       force  row level security;
alter table public.ticket_tiers enable row level security;
alter table public.ticket_tiers force  row level security;

-- Privilegios base (RLS sigue filtrando por encima de estos grants).
grant select, insert, update, delete on public.events       to authenticated;
grant select, insert, update, delete on public.ticket_tiers to authenticated;

-- ─────────────────────────────── events ───────────────────────────────
-- Lectura: la propia empresa; SUPER_ADMIN ve todas (req. 1.1, 1.4).
create policy events_select on public.events
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

-- Inserción: COMPANY_ADMIN o EVENT_MANAGER de la propia empresa (req. 1.5, 2.1, 2.2).
create policy events_insert on public.events
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

-- Actualización: COMPANY_ADMIN o EVENT_MANAGER de la propia empresa.
create policy events_update on public.events
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  )
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

-- Eliminación: solo COMPANY_ADMIN de la propia empresa (req. 2.2, 3.5).
create policy events_delete on public.events
  for delete to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) = 'COMPANY_ADMIN'
    )
  );

-- ──────────────────────────── ticket_tiers ────────────────────────────
-- company_id se sincroniza con el evento padre vía trigger antes del WITH CHECK,
-- por lo que referenciar un evento de otra empresa hace fallar el chequeo (req. 1.6).
create policy ticket_tiers_select on public.ticket_tiers
  for select to authenticated
  using (
    (select public.is_super_admin())
    or company_id = (select public.auth_company_id())
  );

create policy ticket_tiers_insert on public.ticket_tiers
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

create policy ticket_tiers_update on public.ticket_tiers
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  )
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

create policy ticket_tiers_delete on public.ticket_tiers
  for delete to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id())
      and (select public.auth_role()) in ('COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

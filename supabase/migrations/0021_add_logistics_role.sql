-- 0021_add_logistics_role.sql
-- Agregar el rol LOGISTICS en la base de datos y actualizar las políticas RLS.

-- 1) Agregar el nuevo rol al enum app_role
ALTER TYPE public.app_role ADD VALUE 'LOGISTICS';

-- 2) Recrear políticas de RLS en public.tickets para incluir al rol LOGISTICS
DROP POLICY IF EXISTS tickets_update ON public.tickets;
CREATE POLICY tickets_update ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'LOGISTICS')
    )
  )
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'LOGISTICS')
    )
  );

-- 3) Recrear políticas de RLS en public.checkins para incluir al rol LOGISTICS
DROP POLICY IF EXISTS checkins_insert ON public.checkins;
CREATE POLICY checkins_insert ON public.checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'LOGISTICS')
    )
  );

-- 4) Recrear políticas de RLS en public.cash_sessions para incluir al rol LOGISTICS
DROP POLICY IF EXISTS cash_sessions_insert ON public.cash_sessions;
CREATE POLICY cash_sessions_insert ON public.cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS')
    )
  );

DROP POLICY IF EXISTS cash_sessions_update ON public.cash_sessions;
CREATE POLICY cash_sessions_update ON public.cash_sessions
  FOR UPDATE TO authenticated
  USING (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS')
    )
  )
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS')
    )
  );

-- 5) Recrear políticas de RLS en public.door_sales para incluir al rol LOGISTICS
DROP POLICY IF EXISTS door_sales_insert ON public.door_sales;
CREATE POLICY door_sales_insert ON public.door_sales
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER', 'LOGISTICS')
    )
  );

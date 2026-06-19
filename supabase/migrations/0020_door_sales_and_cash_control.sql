-- 0020_door_sales_and_cash_control.sql
-- Tablas, RLS y lógica para el registro de ventas rápidas en puerta y control de cajas.

-- 1) Alteración de la tabla tickets existente
ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online' CHECK (channel IN ('online', 'door')),
  ADD COLUMN IF NOT EXISTS cash_session_id uuid;

-- 2) Crear tabla de sesiones de caja
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_balance numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
  closing_balance_expected numeric(12, 2) CHECK (closing_balance_expected >= 0),
  closing_balance_real numeric(12, 2) CHECK (closing_balance_real >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Crear tabla de transacciones de ventas en puerta
CREATE TABLE public.door_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  cash_session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Vincular la FK de cash_session_id en tickets a la tabla cash_sessions
ALTER TABLE public.tickets 
  ADD CONSTRAINT fk_tickets_cash_session 
  FOREIGN KEY (cash_session_id) 
  REFERENCES public.cash_sessions(id) 
  ON DELETE SET NULL;

-- 5) Índices
CREATE INDEX cash_sessions_company_event_idx ON public.cash_sessions (company_id, event_id);
CREATE INDEX cash_sessions_user_idx ON public.cash_sessions (user_id);
CREATE INDEX door_sales_session_idx ON public.door_sales (cash_session_id);
CREATE INDEX door_sales_company_event_idx ON public.door_sales (company_id, event_id);

-- Restricción única parcial: máximo una sesión abierta por operario a la vez por evento (Req 1.3)
CREATE UNIQUE INDEX cash_sessions_unique_active_user_idx 
  ON public.cash_sessions (event_id, user_id) 
  WHERE (status = 'open');

-- 6) Habilitar RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.door_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.door_sales FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.cash_sessions TO authenticated;
GRANT SELECT, INSERT ON public.door_sales TO authenticated;

-- Políticas de RLS para cash_sessions
CREATE POLICY cash_sessions_select ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (
    (select public.is_super_admin())
    OR company_id = (select public.auth_company_id())
  );

CREATE POLICY cash_sessions_insert ON public.cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

CREATE POLICY cash_sessions_update ON public.cash_sessions
  FOR UPDATE TO authenticated
  USING (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  )
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

-- Políticas de RLS para door_sales
CREATE POLICY door_sales_select ON public.door_sales
  FOR SELECT TO authenticated
  USING (
    (select public.is_super_admin())
    OR company_id = (select public.auth_company_id())
  );

CREATE POLICY door_sales_insert ON public.door_sales
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.is_super_admin())
    OR (
      company_id = (select public.auth_company_id())
      AND (select public.auth_role()) IN ('GATE_STAFF', 'COMPANY_ADMIN', 'EVENT_MANAGER')
    )
  );

-- 7) Triggers de seguridad y automatizaciones
-- Trigger para fijar updated_at
CREATE TRIGGER cash_sessions_set_updated_at
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Función para impedir transacciones sobre cajas cerradas (Req 3.3)
CREATE OR REPLACE FUNCTION public.check_cash_session_active_before_sale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  v_session_status text;
begin
  select status into v_session_status from public.cash_sessions where id = new.cash_session_id;
  if v_session_status is null then
    raise exception 'La sesión de caja % no existe', new.cash_session_id;
  end if;
  if v_session_status = 'closed' then
    raise exception 'La sesión de caja % ya está cerrada. No se permiten nuevas ventas.', new.cash_session_id;
  end if;
  return new;
end;
$$;

-- Trigger sobre la inserción de door_sales para validar que la caja esté abierta
CREATE TRIGGER check_cash_session_before_door_sale
  BEFORE INSERT ON public.door_sales
  FOR EACH ROW EXECUTE FUNCTION public.check_cash_session_active_before_sale();

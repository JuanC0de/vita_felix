-- 0023_wompi_integration.sql
-- Migración para la integración de la pasarela de pagos Wompi y soporte administrativo.

-- 1) Agregar columnas de configuración de Wompi a la tabla de empresas
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS wompi_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wompi_public_key TEXT,
  ADD COLUMN IF NOT EXISTS wompi_integrity_secret TEXT,
  ADD COLUMN IF NOT EXISTS wompi_events_secret TEXT;

-- Restricción para garantizar que si Wompi está activo, las llaves esenciales no estén vacías
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS check_wompi_credentials;
ALTER TABLE public.companies
  ADD CONSTRAINT check_wompi_credentials 
  CHECK (
    (wompi_enabled = false) OR 
    (wompi_enabled = true AND wompi_public_key IS NOT NULL AND wompi_integrity_secret IS NOT NULL AND wompi_events_secret IS NOT NULL)
  );

-- 2) Crear tabla de transacciones de pago online
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reference       text NOT NULL UNIQUE,          -- Referencia única generada para el comercio
  wompi_id        text,                           -- ID interno de la transacción de Wompi
  amount_in_cents bigint NOT NULL CHECK (amount_in_cents > 0),
  currency        char(3) NOT NULL DEFAULT 'COP',
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'voided', 'error')),
  
  -- Datos estructurados de los asistentes y los tiers seleccionados para su emisión posterior
  -- Formato: [{ tierId: "uuid", fullName: "Nombre", email: "correo@mail.com", cedula: "12345" }]
  attendees_data  jsonb NOT NULL,
  
  -- Trazabilidad de soporte para emisión manual
  audited_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  audited_at      timestamptz,
  audit_note      text,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS payment_transactions_reference_idx ON public.payment_transactions(reference);
CREATE INDEX IF NOT EXISTS payment_transactions_company_event_idx ON public.payment_transactions(company_id, event_id);

-- Trigger para actualizar updated_at en payment_transactions
CREATE TRIGGER set_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Habilitar RLS en la tabla de transacciones
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions FORCE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS payment_transactions_select_public ON public.payment_transactions;
CREATE POLICY payment_transactions_select_public ON public.payment_transactions
  FOR SELECT TO anon, authenticated
  USING (true); -- Lectura pública por referencia para la confirmación en el cliente

DROP POLICY IF EXISTS payment_transactions_admin ON public.payment_transactions;
CREATE POLICY payment_transactions_admin ON public.payment_transactions
  FOR ALL TO authenticated
  USING (
    (select public.is_super_admin())
    OR company_id = (select public.auth_company_id())
  );

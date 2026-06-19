-- 0022_add_transfer_payment_method.sql
-- Modifica la restricción CHECK en door_sales para permitir el método de pago por transferencia.

-- 1) Eliminar la restricción check existente
ALTER TABLE public.door_sales DROP CONSTRAINT IF EXISTS door_sales_payment_method_check;

-- 2) Agregar la nueva restricción que admite 'cash', 'card' y 'transfer'
ALTER TABLE public.door_sales ADD CONSTRAINT door_sales_payment_method_check CHECK (payment_method IN ('cash', 'card', 'transfer'));

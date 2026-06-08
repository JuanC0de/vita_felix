-- 0018_add_transfer_receipt.sql
-- Agrega la columna transfer_receipt_path a la tabla tickets para almacenar la ruta de los comprobantes de transferencia.

alter table public.tickets
  add column if not exists transfer_receipt_path text;

-- 0013_event_flyer.sql
-- Agrega soporte para almacenar la URL del flyer promocional en la tabla de eventos.
alter table public.events add column if not exists flyer_url text;

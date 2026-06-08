-- 0016_event_theme_config.sql
-- Añade la columna theme_config a la tabla de eventos para soportar la parametrización visual.
alter table public.events add column if not exists theme_config jsonb default '{}'::jsonb;

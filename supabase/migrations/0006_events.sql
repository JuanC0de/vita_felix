-- 0006_events.sql
-- Catálogo de eventos musicales por empresa. Hereda el patrón multi-tenant de la
-- foundation: company_id no nulo y aislamiento por RLS (ver 0008_events_rls.sql).

-- Enum cerrado del ciclo de vida del evento (req. 4.1).
create type public.event_status as enum (
  'draft',
  'published',
  'finished',
  'cancelled'
);

-- Un evento pertenece a una empresa. Arranca en 'draft' (req. 3.1).
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  venue       text not null check (length(btrim(venue)) > 0),
  event_at    timestamptz not null,
  status      public.event_status not null default 'draft',
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índice compuesto liderado por company_id: requerido para que las políticas RLS
-- que filtran por empresa usen index scan en lugar de seq scan.
create index events_company_id_idx on public.events (company_id, id);

-- Mantiene updated_at al actualizar.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- 0007_ticket_tiers.sql
-- Etapas de boletería de un evento (preventa, general, VIP, etc.).
-- company_id se DESNORMALIZA desde el evento padre para que las políticas RLS
-- comparen directamente contra auth_company_id() sin subconsultas por fila;
-- un trigger garantiza que coincida con events.company_id (req. 1.6).

create table public.ticket_tiers (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  price       numeric(12, 2) not null default 0 check (price >= 0),
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  quota       integer not null default 0 check (quota >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index ticket_tiers_event_id_idx on public.ticket_tiers (event_id);
create index ticket_tiers_company_id_idx on public.ticket_tiers (company_id, event_id);

-- Garantiza que el tier herede la empresa de su evento (no se puede vincular a un
-- evento de otra empresa, incluso si el cliente envía un company_id distinto).
create or replace function public.ticket_tiers_sync_company_id()
returns trigger
language plpgsql
as $$
declare
  parent_company uuid;
begin
  select company_id into parent_company from public.events where id = new.event_id;
  if parent_company is null then
    raise exception 'El evento % no existe', new.event_id;
  end if;
  new.company_id := parent_company;
  return new;
end;
$$;

create trigger ticket_tiers_sync_company_id
  before insert or update on public.ticket_tiers
  for each row execute function public.ticket_tiers_sync_company_id();

create trigger ticket_tiers_set_updated_at
  before update on public.ticket_tiers
  for each row execute function public.set_updated_at();

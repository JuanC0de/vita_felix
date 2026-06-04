-- 0009_ticketing.sql
-- Ciclo de vida del ticket: asistentes, tickets y auditoría de check-in.
-- Multi-tenant: company_id denormalizado (lo fija el registro server-side desde
-- el evento). La cédula se guarda cifrada (cedula_enc) + hash determinista
-- (cedula_hash) para el UNIQUE por evento (req. 1.4, 2.1, 7.3).

-- Estados del ticket (enum cerrado, req. 7.3).
create type public.ticket_status as enum ('valid', 'used', 'void');

-- ─────────────────────────────── attendees ───────────────────────────────
create table public.attendees (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  full_name   text not null check (length(btrim(full_name)) > 0),
  email       text not null check (position('@' in email) > 1),
  cedula_enc  text not null,  -- AES-256-GCM; nunca texto plano (req. 2.1)
  cedula_hash text not null,  -- HMAC-SHA256; dedup, no reversible (req. 1.4)
  created_at  timestamptz not null default now(),
  -- Una cédula = un registro por evento (req. 1.4).
  unique (event_id, cedula_hash)
);

create index attendees_company_idx on public.attendees (company_id, event_id);

-- ──────────────────────────────── tickets ─────────────────────────────────
create table public.tickets (
  id          uuid primary key default gen_random_uuid(),  -- id opaco del QR
  company_id  uuid not null references public.companies(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  tier_id     uuid not null references public.ticket_tiers(id) on delete restrict,
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  status      public.ticket_status not null default 'valid',
  used_at     timestamptz,
  pdf_path    text,
  created_at  timestamptz not null default now()
);

create index tickets_company_idx on public.tickets (company_id, event_id);
create index tickets_event_idx   on public.tickets (event_id);

-- ──────────────────────────────── checkins ────────────────────────────────
-- Auditoría de cada intento de validación (req. 6.5). ticket_id puede quedar
-- nulo si el ticket se elimina; result registra el desenlace.
create table public.checkins (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  ticket_id   uuid references public.tickets(id) on delete set null,
  scanned_by  uuid references auth.users(id) on delete set null,
  result      text not null,
  created_at  timestamptz not null default now()
);

create index checkins_ticket_idx  on public.checkins (ticket_id);
create index checkins_company_idx on public.checkins (company_id, created_at);

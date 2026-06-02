-- 0001_init_tenancy.sql
-- Esquema base multi-tenant: empresas, perfiles de usuario y enum de roles.
-- Fuente de verdad del aislamiento por empresa y del control de acceso por rol.

-- Enum cerrado con los cuatro roles reconocidos por la plataforma.
create type public.app_role as enum (
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'EVENT_MANAGER',
  'GATE_STAFF'
);

-- Aggregate root del tenant.
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- Identidad de aplicación de un usuario de auth.users.
-- company_id es NULL solo para SUPER_ADMIN (acceso transversal).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  company_id  uuid references public.companies (id) on delete restrict,
  role        public.app_role not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  -- Invariante: todo perfil no SUPER_ADMIN debe pertenecer a una empresa.
  constraint profiles_company_required_for_non_super_admin
    check (role = 'SUPER_ADMIN' or company_id is not null)
);

-- Índice compuesto con company_id como columna líder: requerido para que las
-- políticas RLS que filtran por empresa usen index scan en lugar de seq scan.
create index profiles_company_id_idx on public.profiles (company_id, id);

-- 0012_enterprise_multitenancy.sql
-- Ampliación del esquema para soporte de multiempresa y memberships.

-- 1) Modificar la tabla companies existente para agregar campos informativos y operativos
alter table public.companies 
add column if not exists legal_name text,
add column if not exists document_number text,
add column if not exists email text,
add column if not exists phone text,
add column if not exists city text,
add column if not exists country text default 'Colombia',
add column if not exists logo_url text,
add column if not exists plan text default 'free',
add column if not exists status text default 'active',
add column if not exists max_events integer default 3,
add column if not exists max_users integer default 3,
add column if not exists commission_percentage numeric(5,2) default 0;

-- 2) Crear tabla pivote user_companies para registrar las afiliaciones de usuarios a empresas
create table if not exists public.user_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.app_role not null,
  status text not null default 'active',
  created_at timestamp with time zone not null default now(),
  unique (user_id, company_id)
);

-- Habilitar RLS
alter table public.user_companies enable row level security;
alter table public.user_companies force row level security;

-- Otorgar privilegios para usuarios autenticados
grant select, insert, update, delete on public.user_companies to authenticated;

-- Políticas RLS para la tabla user_companies
create policy user_companies_select on public.user_companies
  for select to authenticated
  using (
    (select public.is_super_admin())
    or user_id = (select auth.uid())
    or company_id = (select public.auth_company_id())
  );

create policy user_companies_insert on public.user_companies
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id()) 
      and (select public.auth_role()) = 'COMPANY_ADMIN'
    )
  );

create policy user_companies_update on public.user_companies
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id()) 
      and (select public.auth_role()) = 'COMPANY_ADMIN'
    )
  );

create policy user_companies_delete on public.user_companies
  for delete to authenticated
  using (
    (select public.is_super_admin())
    or (
      company_id = (select public.auth_company_id()) 
      and (select public.auth_role()) = 'COMPANY_ADMIN'
    )
  );

-- 3) Modificar políticas RLS de profiles para permitir la gestión de usuarios por parte de COMPANY_ADMIN
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists profiles_delete on public.profiles;

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    (select public.is_super_admin())
    or (
      (select public.auth_role()) = 'COMPANY_ADMIN'
      and company_id = (select public.auth_company_id())
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (
    (select public.is_super_admin())
    or (
      (select public.auth_role()) = 'COMPANY_ADMIN'
      and company_id = (select public.auth_company_id())
    )
  );

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (
    (select public.is_super_admin())
    or (
      (select public.auth_role()) = 'COMPANY_ADMIN'
      and company_id = (select public.auth_company_id())
    )
  );

-- 4) Traspasar las membresías existentes en profiles a la tabla user_companies
insert into public.user_companies (user_id, company_id, role, status)
select id, company_id, role, 'active'
from public.profiles
where company_id is not null
on conflict (user_id, company_id) do nothing;

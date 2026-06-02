-- _harness.sql
-- Shim local del entorno de Supabase para validar migraciones contra un Postgres
-- estándar (sin GoTrue). Reproduce lo mínimo: esquema auth, auth.jwt()/uid()
-- (dirigidas por la GUC request.jwt.claims, igual que Supabase) y los roles.
-- NO forma parte del esquema de producción; solo se usa en pruebas.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid, aud text, role text, email text unique,
  encrypted_password text, email_confirmed_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb
);

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;

grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.jwt(), auth.uid() to authenticated, anon;

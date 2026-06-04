-- 0011_storage_tickets.sql
-- Bucket privado para los PDF de tickets (req. 4.2). El PDF se sube con SERVICE
-- ROLE server-side y se entrega al asistente mediante URL firmada temporal; no
-- es público. El staff autenticado de la empresa puede leer los objetos de su
-- empresa (la ruta del objeto es tickets/{ticketId}.pdf).
--
-- NOTA: este script requiere el esquema `storage` de Supabase; no se aplica en
-- el harness de Postgres local (ver supabase/tests/run.sh).

insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;

-- Lectura por staff autenticado cuyo ticket pertenece a su empresa.
-- (El acceso público se hace por URL firmada, que omite estas policies.)
create policy "tickets_read_own_company" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tickets'
    and exists (
      select 1 from public.tickets t
      where t.pdf_path = storage.objects.name
        and (
          (select public.is_super_admin())
          or t.company_id = (select public.auth_company_id())
        )
    )
  );

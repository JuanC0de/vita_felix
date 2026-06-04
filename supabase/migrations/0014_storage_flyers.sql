-- 0014_storage_flyers.sql
-- Bucket público para almacenar los flyers promocionales de eventos.
-- Permite lectura pública para renderizar las imágenes en el portal público.

insert into storage.buckets (id, name, public)
values ('flyers', 'flyers', true)
on conflict (id) do nothing;

create policy "flyers_public_read" on storage.objects
  for select to public
  using (bucket_id = 'flyers');

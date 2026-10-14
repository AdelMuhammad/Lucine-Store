-- Delivery proof workflow migration.
-- Run after supabase/schema.sql in the Supabase SQL editor.

alter table public.shipments
  add column if not exists carrier_name text not null default '',
  add column if not exists carrier_name_ar text not null default '',
  add column if not exists carrier_tracking_url text not null default '',
  add column if not exists agent_name text not null default '',
  add column if not exists proof_image_path text not null default '',
  add column if not exists proof_note text not null default '',
  add column if not exists proof_at timestamptz,
  add column if not exists delivered_by text not null default '';

update public.shipments s
set carrier_name = coalesce(nullif(c.name, ''), s.carrier_name),
    carrier_name_ar = coalesce(nullif(c.name_ar, ''), s.carrier_name_ar),
    carrier_tracking_url = coalesce(nullif(c.tracking_url, ''), s.carrier_tracking_url)
from public.carriers c
where c.id = s.carrier_id and s.carrier_id <> '';

update public.shipments s
set agent_name = a.name
from public.delivery_agents a
where a.id = s.agent_id and s.agent_id <> '';

-- Delivery evidence is private: customers get signed URLs only when their
-- authenticated account owns the order linked to the shipment.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'delivery-proofs',
  'delivery-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "delivery proofs admin upload" on storage.objects;
create policy "delivery proofs admin upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and name like 'orders/%'
    and public.is_admin()
  );

drop policy if exists "delivery proofs read admin or owner" on storage.objects;
create policy "delivery proofs read admin or owner" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.shipments s
        join public.orders o on o.id = s.order_id
        where s.proof_image_path = storage.objects.name
          and o.user_id = auth.uid()
      )
    )
  );

drop policy if exists "delivery proofs admin delete" on storage.objects;
create policy "delivery proofs admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and public.is_admin()
  );

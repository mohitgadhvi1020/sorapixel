-- ═══════════════════════════════════════════════════════
-- Batch Listings — stores bulk-uploaded images with
-- AI-generated titles, descriptions, and attributes.
-- ═══════════════════════════════════════════════════════

create table if not exists public.batch_listings (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  batch_id           uuid not null,
  image_storage_path text not null,
  original_filename  text not null default '',
  title              text not null default '',
  description        text not null default '',
  meta_description   text not null default '',
  alt_text           text not null default '',
  attributes         jsonb default '{}',
  status             text not null default 'completed',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.batch_listings enable row level security;

create policy "batch_listings_select_own" on public.batch_listings
  for select using (auth.uid() = client_id);

create index idx_batch_listings_client on public.batch_listings(client_id);
create index idx_batch_listings_batch on public.batch_listings(batch_id);
create index idx_batch_listings_created on public.batch_listings(created_at desc);

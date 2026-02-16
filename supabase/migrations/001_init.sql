-- ═══════════════════════════════════════════════════════
-- SoraPixel — initial schema
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Clients table (linked to Supabase auth.users)
create table if not exists public.clients (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  company_name text not null default '',
  contact_name text not null default '',
  is_active   boolean not null default true,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Clients can read their own row
create policy "clients_select_own" on public.clients
  for select using (auth.uid() = id);

-- Service role (admin) can do everything — no policy needed, bypasses RLS

-- 2. Generations table (tracks every AI call)
create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  generation_type text not null, -- hero, closeup, angle, recolor, listing, bg_removal
  input_tokens    integer not null default 0,
  output_tokens   integer not null default 0,
  total_tokens    integer not null default 0,
  model_used      text not null default 'gemini-2.5-flash',
  status          text not null default 'success', -- success, failed
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

alter table public.generations enable row level security;

create policy "generations_select_own" on public.generations
  for select using (auth.uid() = client_id);

create index idx_generations_client on public.generations(client_id);
create index idx_generations_created on public.generations(created_at desc);

-- 3. Images table (tracks stored images)
create table if not exists public.images (
  id              uuid primary key default gen_random_uuid(),
  generation_id   uuid references public.generations(id) on delete set null,
  client_id       uuid not null references public.clients(id) on delete cascade,
  label           text not null,
  storage_path    text not null,
  file_size_bytes integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.images enable row level security;

create policy "images_select_own" on public.images
  for select using (auth.uid() = client_id);

create index idx_images_client on public.images(client_id);

-- 4. Downloads table (tracks every download event)
create table if not exists public.downloads (
  id            uuid primary key default gen_random_uuid(),
  image_id      uuid not null references public.images(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

alter table public.downloads enable row level security;

create policy "downloads_select_own" on public.downloads
  for select using (auth.uid() = client_id);

create index idx_downloads_client on public.downloads(client_id);
create index idx_downloads_image on public.downloads(image_id);

-- 5. Storage bucket for generated images
insert into storage.buckets (id, name, public) 
values ('sorapixel-images', 'sorapixel-images', false)
on conflict (id) do nothing;

-- Storage policies: only service role writes; authenticated users can read their own
create policy "images_read_own" on storage.objects
  for select using (
    bucket_id = 'sorapixel-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

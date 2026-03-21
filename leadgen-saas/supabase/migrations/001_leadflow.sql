-- ═══════════════════════════════════════════════════════════════════════
-- LeadFlow AI — Database Schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Profiles (linked to auth.users)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  company_name  text not null default '',
  plan          text not null default 'starter',
  credits       integer not null default 1000,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- 2. Brands
create table if not exists public.brands (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  company_name      text not null default '',
  description       text not null default '',
  target_customers  text not null default '',
  usp               text not null default '',
  website           text default '',
  phone             text default '',
  email             text default '',
  logo_url          text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.brands enable row level security;
create policy "brands_select_own" on public.brands for select using (auth.uid() = user_id);
create policy "brands_insert_own" on public.brands for insert with check (auth.uid() = user_id);
create policy "brands_update_own" on public.brands for update using (auth.uid() = user_id);

-- 3. Leads
create table if not exists public.lg_leads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  company_name  text not null,
  website       text default '',
  email         text default '',
  phone         text default '',
  location      text default '',
  industry      text default '',
  rating        real default 0,
  reviews       integer default 0,
  size          text default 'small',
  source        text default 'google_maps',
  status        text not null default 'new',
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now()
);

alter table public.lg_leads enable row level security;
create policy "leads_select_own" on public.lg_leads for select using (auth.uid() = user_id);
create policy "leads_insert_own" on public.lg_leads for insert with check (auth.uid() = user_id);
create policy "leads_update_own" on public.lg_leads for update using (auth.uid() = user_id);
create policy "leads_delete_own" on public.lg_leads for delete using (auth.uid() = user_id);

create index idx_lg_leads_user on public.lg_leads(user_id);
create index idx_lg_leads_status on public.lg_leads(status);
create index idx_lg_leads_created on public.lg_leads(created_at desc);

-- 4. Campaigns
create table if not exists public.lg_campaigns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  status        text not null default 'draft',
  leads_count   integer not null default 0,
  emails_sent   integer not null default 0,
  open_rate     real default 0,
  reply_rate    real default 0,
  created_at    timestamptz not null default now()
);

alter table public.lg_campaigns enable row level security;
create policy "campaigns_select_own" on public.lg_campaigns for select using (auth.uid() = user_id);
create policy "campaigns_insert_own" on public.lg_campaigns for insert with check (auth.uid() = user_id);
create policy "campaigns_update_own" on public.lg_campaigns for update using (auth.uid() = user_id);

-- 5. Campaign Leads (junction)
create table if not exists public.lg_campaign_leads (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.lg_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.lg_leads(id) on delete cascade,
  email_status  text not null default 'pending',
  created_at    timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

alter table public.lg_campaign_leads enable row level security;

-- 6. Emails
create table if not exists public.lg_emails (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lead_id       uuid references public.lg_leads(id) on delete set null,
  campaign_id   uuid references public.lg_campaigns(id) on delete set null,
  subject       text not null,
  body          text not null,
  status        text not null default 'draft',
  sent_at       timestamptz,
  opened_at     timestamptz,
  replied_at    timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.lg_emails enable row level security;
create policy "emails_select_own" on public.lg_emails for select using (auth.uid() = user_id);
create policy "emails_insert_own" on public.lg_emails for insert with check (auth.uid() = user_id);

create index idx_lg_emails_user on public.lg_emails(user_id);
create index idx_lg_emails_campaign on public.lg_emails(campaign_id);

-- 7. Documents (brand assets)
create table if not exists public.lg_documents (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands(id) on delete cascade,
  file_type     text not null,
  file_name     text not null,
  file_url      text not null,
  created_at    timestamptz not null default now()
);

alter table public.lg_documents enable row level security;

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('leadflow-assets', 'leadflow-assets', false)
on conflict (id) do nothing;

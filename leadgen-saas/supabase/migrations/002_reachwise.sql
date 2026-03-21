-- ═══════════════════════════════════════════════════════════════════════
-- ReachWise — Additional Schema
-- Run in Supabase SQL Editor after 001_leadflow.sql
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Company Brains (one per user, built from website + uploaded files)
create table if not exists public.company_brains (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  website_url       text,
  company_name      text,
  services          jsonb default '[]',
  industries_served jsonb default '[]',
  target_customers  text default '',
  usp               text default '',
  proof_points      jsonb default '[]',
  tone              text default '',
  raw_website_content text default '',
  raw_file_content  text default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.company_brains enable row level security;
create policy "brains_select_own" on public.company_brains for select using (auth.uid() = user_id);
create policy "brains_insert_own" on public.company_brains for insert with check (auth.uid() = user_id);
create policy "brains_update_own" on public.company_brains for update using (auth.uid() = user_id);
create policy "brains_delete_own" on public.company_brains for delete using (auth.uid() = user_id);

create index idx_company_brains_user on public.company_brains(user_id);

-- 2. Prospects (discovered + researched businesses)
create table if not exists public.prospects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  company_name      text not null,
  website           text default '',
  email             text default '',
  phone             text default '',
  address           text default '',
  industry          text default '',
  rating            real default 0,
  reviews           integer default 0,
  source            text default 'google_maps',
  research_summary  text default '',
  research_data     jsonb default '{}',
  email_confidence  text default 'none',
  score             integer default 0,
  status            text default 'new',
  search_query      text default '',
  place_id          text default '',
  created_at        timestamptz not null default now()
);

alter table public.prospects enable row level security;
create policy "prospects_select_own" on public.prospects for select using (auth.uid() = user_id);
create policy "prospects_insert_own" on public.prospects for insert with check (auth.uid() = user_id);
create policy "prospects_update_own" on public.prospects for update using (auth.uid() = user_id);
create policy "prospects_delete_own" on public.prospects for delete using (auth.uid() = user_id);

create index idx_prospects_user on public.prospects(user_id);
create index idx_prospects_status on public.prospects(status);
create index idx_prospects_score on public.prospects(score desc);
create index idx_prospects_created on public.prospects(created_at desc);

-- 3. Email Drafts (generated outreach)
create table if not exists public.drafts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  prospect_id           uuid references public.prospects(id) on delete cascade,
  subject               text not null,
  body                  text not null,
  personalization_reason text default '',
  confidence            text default 'medium',
  status                text default 'draft',
  created_at            timestamptz not null default now()
);

alter table public.drafts enable row level security;
create policy "drafts_select_own" on public.drafts for select using (auth.uid() = user_id);
create policy "drafts_insert_own" on public.drafts for insert with check (auth.uid() = user_id);
create policy "drafts_update_own" on public.drafts for update using (auth.uid() = user_id);
create policy "drafts_delete_own" on public.drafts for delete using (auth.uid() = user_id);

create index idx_drafts_user on public.drafts(user_id);
create index idx_drafts_prospect on public.drafts(prospect_id);
create index idx_drafts_status on public.drafts(status);

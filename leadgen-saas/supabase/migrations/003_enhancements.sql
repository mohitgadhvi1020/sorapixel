-- ═══════════════════════════════════════════════════════════════════════
-- ReachWise — Enhancement Migration
-- Adds: socials to prospects, sent_emails tracking, campaigns support
-- Run after 002_reachwise.sql
-- ═══════════════════════════════════════════════════════════════════════

-- Add social profiles and contact_name to prospects
alter table public.prospects add column if not exists socials jsonb default '{}';
alter table public.prospects add column if not exists contact_name text default '';

-- Sent emails tracking
create table if not exists public.sent_emails (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  draft_id      uuid references public.drafts(id) on delete set null,
  prospect_id   uuid references public.prospects(id) on delete set null,
  to_email      text not null,
  subject       text not null,
  body          text not null,
  resend_id     text default '',
  status        text not null default 'sent',
  sent_at       timestamptz not null default now(),
  delivered_at  timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  bounced_at    timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.sent_emails enable row level security;
create policy "sent_emails_select_own" on public.sent_emails for select using (auth.uid() = user_id);
create policy "sent_emails_insert_own" on public.sent_emails for insert with check (auth.uid() = user_id);
create policy "sent_emails_update_own" on public.sent_emails for update using (auth.uid() = user_id);

create index idx_sent_emails_user on public.sent_emails(user_id);
create index idx_sent_emails_prospect on public.sent_emails(prospect_id);
create index idx_sent_emails_status on public.sent_emails(status);

-- Campaigns table for managing outreach sequences
create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  description     text default '',
  status          text not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.campaigns enable row level security;
create policy "campaigns_select_own" on public.campaigns for select using (auth.uid() = user_id);
create policy "campaigns_insert_own" on public.campaigns for insert with check (auth.uid() = user_id);
create policy "campaigns_update_own" on public.campaigns for update using (auth.uid() = user_id);
create policy "campaigns_delete_own" on public.campaigns for delete using (auth.uid() = user_id);

create index idx_campaigns_user on public.campaigns(user_id);

-- Campaign prospects junction
create table if not exists public.campaign_prospects (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  prospect_id   uuid not null references public.prospects(id) on delete cascade,
  draft_id      uuid references public.drafts(id) on delete set null,
  email_status  text not null default 'pending',
  created_at    timestamptz not null default now(),
  unique(campaign_id, prospect_id)
);

alter table public.campaign_prospects enable row level security;
create policy "cp_select" on public.campaign_prospects for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "cp_insert" on public.campaign_prospects for insert
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "cp_update" on public.campaign_prospects for update
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy "cp_delete" on public.campaign_prospects for delete
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

-- Add campaign_id to drafts for linking
alter table public.drafts add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add listing_tokens balance column to clients table.
-- Each bulk listing image costs 5 tokens. Admins add tokens via the dashboard.

alter table public.clients
  add column if not exists listing_tokens integer not null default 0;

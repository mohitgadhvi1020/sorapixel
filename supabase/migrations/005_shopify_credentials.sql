-- Add Shopify credentials to clients table.
-- Clients paste their store URL and custom app access token.

alter table public.clients
  add column if not exists shopify_store_url text not null default '',
  add column if not exists shopify_access_token text not null default '';

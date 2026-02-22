-- ═══════════════════════════════════════════════════════
-- Migration 002: Batch Listings + Shopify Integration
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Add listing_tokens column to clients for bulk listing token balance
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS listing_tokens INTEGER NOT NULL DEFAULT 0;

-- Add Shopify integration columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS shopify_store_url TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS shopify_access_token TEXT DEFAULT '';

-- Batch listings table
CREATE TABLE IF NOT EXISTS public.batch_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  batch_id            TEXT NOT NULL,
  batch_description   TEXT NOT NULL DEFAULT '',
  image_storage_path  TEXT,
  original_filename   TEXT NOT NULL DEFAULT 'unknown',
  title               TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  meta_description    TEXT NOT NULL DEFAULT '',
  alt_text            TEXT NOT NULL DEFAULT '',
  attributes          JSONB DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.batch_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'batch_listings' AND policyname = 'batch_listings_select_own'
  ) THEN
    CREATE POLICY "batch_listings_select_own" ON public.batch_listings
      FOR SELECT USING (auth.uid() = client_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_batch_listings_client ON public.batch_listings(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_listings_batch ON public.batch_listings(batch_id);

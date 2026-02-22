-- Add jewelry free tier tracking columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS jewelry_free_hero_used INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS jewelry_free_pack_used INTEGER DEFAULT 0;

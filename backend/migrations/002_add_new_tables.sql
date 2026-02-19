-- ═══════════════════════════════════════════════════════
-- SoraPixel — migration 002: Add new tables for Flyr features
-- Run this in the Supabase SQL Editor AFTER 001_init.sql
-- ═══════════════════════════════════════════════════════

-- Extend clients table with new fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_address TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_website TEXT DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS apply_branding BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS daily_reward_claimed_at DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- OTP table (for storing OTPs -- simple approach for 100 DAU)
CREATE TABLE IF NOT EXISTS public.otps (
    phone TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    subcategories JSONB DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
    ('Jewellery', 'jewellery', 'Necklace, Earring, Ring, Bracelet', 1),
    ('Fashion & Clothing', 'fashion-clothing', 'Saree, T-Shirt, Footwear, Dress, Jacket', 2),
    ('Accessories', 'accessories', 'Bag, Purse, Watch, Shawl, Belt, Hat', 3),
    ('Kids', 'kids', 'Kids Clothes, Toys, Baby Products', 4),
    ('Home & Living', 'home-living', 'Furniture, Decor, Kitchenware, Bedding', 5),
    ('Art & Craft', 'art-craft', 'Art Supplies, Craft Kits, Stationery', 6),
    ('Beauty & Wellness', 'beauty-wellness', 'Makeup, Skincare, Perfume, Haircare', 7),
    ('Electronics & Gadgets', 'electronics', 'Phone, Headphone, Speaker, Laptop', 8),
    ('Food & Beverages', 'food-beverages', 'Restaurant Dishes, Packaged Food, Beverages', 9)
ON CONFLICT (slug) DO NOTHING;

-- Add foreign key for category_id on clients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'clients_category_id_fkey'
    ) THEN
        ALTER TABLE public.clients
            ADD CONSTRAINT clients_category_id_fkey
            FOREIGN KEY (category_id) REFERENCES public.categories(id);
    END IF;
END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Project',
    project_type TEXT NOT NULL DEFAULT 'photoshoot',
    category_id UUID REFERENCES public.categories(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_own" ON public.projects
    FOR SELECT USING (auth.uid() = client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id, created_at DESC);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount_paise INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    plan_type TEXT NOT NULL DEFAULT 'token_pack',
    tokens_added INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select_own" ON public.payments
    FOR SELECT USING (auth.uid() = client_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id, created_at DESC);

-- Feed items (pre-generated examples for home page)
CREATE TABLE IF NOT EXISTS public.feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id),
    title TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    item_type TEXT NOT NULL DEFAULT 'photoshoot',
    tags JSONB DEFAULT '[]',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_category ON public.feed_items(category_id, display_order);

-- Index for phone lookup on clients
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- Pricing plans table — allows admin to manage plans from the dashboard
-- instead of requiring code changes and redeployments.

CREATE TABLE IF NOT EXISTS public.pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'token_pack',
    price_inr INTEGER NOT NULL DEFAULT 0,
    price_usd INTEGER NOT NULL DEFAULT 0,
    price_eur INTEGER NOT NULL DEFAULT 0,
    tokens INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    recommended BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pricing_plans"
    ON public.pricing_plans FOR ALL
    USING (true)
    WITH CHECK (true);

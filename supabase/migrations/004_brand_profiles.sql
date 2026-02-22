-- Brand profiles: each brand stores its listing prompt config as structured JSONB
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES public.clients(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brand_profiles' AND policyname = 'brand_profiles_select_own'
  ) THEN
    CREATE POLICY "brand_profiles_select_own" ON public.brand_profiles
      FOR SELECT USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'brand_profiles' AND policyname = 'brand_profiles_update_own'
  ) THEN
    CREATE POLICY "brand_profiles_update_own" ON public.brand_profiles
      FOR UPDATE USING (auth.uid() = created_by);
  END IF;
END $$;

-- Link clients to their brand
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brand_profiles(id);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_slug ON public.brand_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_clients_brand ON public.clients(brand_id);

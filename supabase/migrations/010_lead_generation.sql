-- Lead Generation Pipeline Tables
-- Separate from main app tables; used by the leadgen service.

-- ── leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name  text NOT NULL,
    platform    text NOT NULL CHECK (platform IN ('google_places','shopify','etsy','instagram','manual','ai_search')),
    region      text NOT NULL CHECK (region IN ('us','eu','dubai','other')),
    store_url   text NOT NULL,
    domain      text NOT NULL,
    contact_email text,
    contact_name  text,
    phone       text,
    address     text,
    status      text NOT NULL DEFAULT 'discovered'
                CHECK (status IN (
                    'discovered','enriched','no_email',
                    'scraped','scrape_failed',
                    'generating','generated','gen_failed',
                    'queued','sent','delivered','opened','clicked','converted',
                    'bounced','skipped'
                )),
    metadata    jsonb DEFAULT '{}',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_domain_uniq ON leads (domain);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
CREATE INDEX IF NOT EXISTS leads_platform_idx ON leads (platform);
CREATE INDEX IF NOT EXISTS leads_region_idx ON leads (region);

-- ── lead_products ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_products (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id              uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_name         text,
    product_url          text,
    original_image_url   text,
    generated_studio_url text,
    generated_model_url  text,
    jewelry_type         text DEFAULT 'other'
                         CHECK (jewelry_type IN ('ring','necklace','bracelet','earring','pendant','watch','other')),
    status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','generated','failed')),
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_products_lead_idx ON lead_products (lead_id);

-- ── lead_emails ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_emails (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    resend_email_id text,
    subject         text,
    status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','complained')),
    sent_at         timestamptz,
    delivered_at    timestamptz,
    opened_at       timestamptz,
    clicked_at      timestamptz,
    bounced_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_emails_lead_idx ON lead_emails (lead_id);
CREATE INDEX IF NOT EXISTS lead_emails_resend_idx ON lead_emails (resend_email_id);
CREATE INDEX IF NOT EXISTS lead_emails_status_idx ON lead_emails (status);

-- ── RLS: service_role only ───────────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_lead_products" ON lead_products
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_lead_emails" ON lead_emails
    FOR ALL USING (auth.role() = 'service_role');

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_leads_updated_at();

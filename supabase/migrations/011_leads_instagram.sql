-- Add Instagram URL column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS instagram_url text;
CREATE INDEX IF NOT EXISTS leads_instagram_idx ON leads (instagram_url) WHERE instagram_url IS NOT NULL;

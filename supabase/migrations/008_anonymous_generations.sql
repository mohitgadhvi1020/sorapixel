-- Track anonymous (unauthenticated) free generations.
-- One row per anonymous_id = one free generation used.

CREATE TABLE IF NOT EXISTS anonymous_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_generations_anon_id
    ON anonymous_generations (anonymous_id);

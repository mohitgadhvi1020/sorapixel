-- Flow resume: persist in-progress step + inputs so "Continue journey"
-- can hydrate where the user left off.
--
-- Additive migration. Existing rows: current_step/pending_inputs stay NULL /
-- '{}'; frontend falls back to inferring the step from completed actions
-- (old behavior), so this is safe to roll out before any client updates.

-- 1) Jewelry sessions: extend with progress fields.
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS current_step TEXT,
    ADD COLUMN IF NOT EXISTS pending_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS flow_schema_version INTEGER NOT NULL DEFAULT 1;

-- 2) Studio sessions: new table. Studio didn't have a session concept —
-- projects were write-once-on-success so there was nothing to resume.
CREATE TABLE IF NOT EXISTS public.studio_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Studio Shot',
    original_image_path TEXT,
    background_id TEXT,
    quality TEXT DEFAULT 'pro',
    aspect_ratio_id TEXT,
    special_instructions TEXT,
    current_step TEXT,
    pending_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    flow_schema_version INTEGER NOT NULL DEFAULT 1,
    result_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_client
    ON public.studio_sessions (client_id, created_at DESC);

ALTER TABLE public.studio_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY studio_sessions_select ON public.studio_sessions FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY studio_sessions_insert ON public.studio_sessions FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY studio_sessions_update ON public.studio_sessions FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY studio_sessions_delete ON public.studio_sessions FOR DELETE USING (auth.uid() = client_id);

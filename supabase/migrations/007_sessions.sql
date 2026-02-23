-- Sessions: groups all operations on one uploaded product image
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Untitled',
    jewelry_type TEXT,
    background TEXT,
    aspect_ratio_id TEXT,
    quality TEXT DEFAULT 'standard',
    original_image_path TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_client ON public.sessions (client_id, created_at DESC);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_select ON public.sessions FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY sessions_insert ON public.sessions FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY sessions_delete ON public.sessions FOR DELETE USING (auth.uid() = client_id);

-- Session actions: every operation within a session
CREATE TABLE IF NOT EXISTS public.session_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    quality TEXT DEFAULT 'standard',
    tokens_used INTEGER DEFAULT 0,
    input_data JSONB DEFAULT '{}',
    output_images JSONB DEFAULT '[]',
    output_text JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_actions_session ON public.session_actions (session_id, created_at ASC);

ALTER TABLE public.session_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_actions_select ON public.session_actions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.client_id = auth.uid()));
CREATE POLICY session_actions_insert ON public.session_actions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.client_id = auth.uid()));

-- Token logs: centralized deduction tracking for admin analytics
CREATE TABLE IF NOT EXISTS public.token_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,
    tokens_deducted INTEGER NOT NULL,
    quality TEXT DEFAULT 'standard',
    balance_after INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_logs_client ON public.token_logs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_logs_created ON public.token_logs (created_at DESC);

ALTER TABLE public.token_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY token_logs_select ON public.token_logs FOR SELECT USING (auth.uid() = client_id);

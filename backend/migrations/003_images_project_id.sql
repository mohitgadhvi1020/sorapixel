-- Add project_id to images so projects can own images
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_images_project ON public.images(project_id);

-- Allow backend service role to insert into projects and images
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_insert_own'
    ) THEN
        CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_delete_own'
    ) THEN
        CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = client_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'images' AND policyname = 'images_insert_own'
    ) THEN
        CREATE POLICY "images_insert_own" ON public.images FOR INSERT WITH CHECK (true);
    END IF;
END $$;

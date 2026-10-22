-- Phase 2: stage-room saves results itself, keeps a clean master per staging
-- for refines, and records which model made each image.

ALTER TABLE public.stagings
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.stagings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS master_path text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'stage';

CREATE INDEX IF NOT EXISTS stagings_parent_idx ON public.stagings (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stagings_user_created_idx ON public.stagings (user_id, created_at DESC);

ALTER TABLE public.generation_logs
  ADD COLUMN IF NOT EXISTS model text;

-- Private bucket for unlabelled, unwatermarked masters. No client policies:
-- only the stage-room function (service role) reads or writes it, so free
-- users can never fetch a clean copy.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('staging-masters', 'staging-masters', false, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false;

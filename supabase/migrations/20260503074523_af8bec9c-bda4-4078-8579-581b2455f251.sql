ALTER TABLE public.job_analyses
  ADD COLUMN IF NOT EXISTS jd_data jsonb,
  ADD COLUMN IF NOT EXISTS admin_notified boolean NOT NULL DEFAULT false;
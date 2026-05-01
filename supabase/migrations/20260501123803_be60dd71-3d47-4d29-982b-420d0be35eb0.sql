CREATE TABLE public.job_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_title TEXT NOT NULL,
  department TEXT,
  manager_name TEXT,
  raw_input JSONB NOT NULL,
  analysis_result TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create job analyses"
  ON public.job_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view job analyses"
  ON public.job_analyses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update job analyses"
  ON public.job_analyses FOR UPDATE
  USING (true);

CREATE INDEX idx_job_analyses_created_at ON public.job_analyses(created_at DESC);
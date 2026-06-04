CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read companies" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_code text,
  position_title text NOT NULL,
  manager_position text,
  sector text NOT NULL,
  department text NOT NULL DEFAULT '-',
  section text NOT NULL DEFAULT '-',
  subsection text NOT NULL DEFAULT '-',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX positions_company_idx ON public.positions(company_id);
CREATE INDEX positions_scope_idx ON public.positions(company_id, sector, department);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read positions" ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage positions" ON public.positions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.user_scopes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.job_analyses ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.job_analyses ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE public.job_analyses ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE public.job_analyses ADD COLUMN IF NOT EXISTS subsection text;

CREATE OR REPLACE FUNCTION public.user_has_scope(_user_id uuid, _company_id uuid, _sector text, _department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes
      WHERE user_id = _user_id
        AND (company_id IS NULL OR company_id = _company_id)
        AND (sector IS NULL OR sector = _sector)
        AND (department IS NULL OR department = _department)
    );
$$;

DROP POLICY IF EXISTS "Owners and admins view analyses" ON public.job_analyses;
CREATE POLICY "Owners admins and in-scope view analyses" ON public.job_analyses FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_scope(auth.uid(), company_id, sector, department)
);

INSERT INTO public.companies (id, name, parent_id, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'نهضة مصر جروب', NULL, 0),
  ('00000000-0000-0000-0000-000000000002', 'نهضة مصر للنشر', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000003', 'شركة دويتش للصناعات', '00000000-0000-0000-0000-000000000001', 2);
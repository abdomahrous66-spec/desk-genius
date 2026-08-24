CREATE TABLE public.training_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  sector text,
  department text,
  section text,
  position_title text,
  employee_code text,
  employee_name text,
  training_topic text NOT NULL,
  expected_kpi text,
  training_type text,
  training_objective text,
  training_priority text,
  recommended_quarter_1 text,
  recommended_quarter_2 text,
  provider_recommendation text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  -- TP (OD) fields
  employee_title text,
  gender text,
  employee_status text,
  hiring_date date,
  internal_years_experience numeric,
  location text,
  training_identification text,
  source text,
  training_provider text,
  delivery_type text,
  training_start_date date,
  training_end_date date,
  implementation_quarter text,
  implementation_month text,
  implementation_year integer,
  training_days numeric,
  training_hours numeric,
  total_training_cost numeric,
  attendance_status text,
  reason_of_no_show text,
  pre_assessment_score numeric,
  after_assessment_score numeric,
  knowledge_enhancement_roi numeric,
  trainer_evaluation_score numeric,
  content_evaluation_score numeric,
  general_evaluation_score numeric,
  training_effectiveness_status text,
  training_status text,
  employee_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_needs TO authenticated;
GRANT ALL ON public.training_needs TO service_role;

ALTER TABLE public.training_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own training needs"
ON public.training_needs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users and scoped users view training needs"
ON public.training_needs FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR app_private.has_role(auth.uid(), 'owner'::app_role)
  OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
  OR app_private.user_has_scope(auth.uid(), company_id, sector, department)
);

CREATE POLICY "Users update own pending training needs"
ON public.training_needs FOR UPDATE TO authenticated
USING (auth.uid() = created_by AND status = 'new')
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users delete own pending training needs"
ON public.training_needs FOR DELETE TO authenticated
USING (auth.uid() = created_by AND status = 'new');

CREATE POLICY "OD manages all training needs"
ON public.training_needs FOR ALL TO authenticated
USING (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_training_needs_updated_at
BEFORE UPDATE ON public.training_needs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_training_needs_company ON public.training_needs(company_id);
CREATE INDEX idx_training_needs_status ON public.training_needs(status);
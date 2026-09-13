-- 1. Cycles
CREATE TABLE public.appraisal_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  objectives_weight numeric NOT NULL DEFAULT 70,
  competencies_weight numeric NOT NULL DEFAULT 30,
  penalties_weight numeric NOT NULL DEFAULT 5,
  rating_bands jsonb NOT NULL DEFAULT '[
    {"key":"poor","label":"Poor","label_ar":"ضعيف","min":0,"max":59.99,"curve":5},
    {"key":"acceptable","label":"Acceptable","label_ar":"مقبول","min":60,"max":69.99,"curve":15},
    {"key":"good","label":"Good","label_ar":"جيد","min":70,"max":79.99,"curve":60},
    {"key":"very_good","label":"Very Good","label_ar":"جيد جدا","min":80,"max":89.99,"curve":15},
    {"key":"excellent","label":"Excellent","label_ar":"ممتاز","min":90,"max":100,"curve":5}
  ]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Employees in a cycle
CREATE TABLE public.appraisal_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  hiring_date date,
  employee_status text,
  position_en text,
  location text,
  email text,
  phone text,
  sector text,
  department text,
  section text,
  subsection text,
  managerial_level text,
  manager_name text,
  manager_code text,
  parent_position_en text,
  total_weight numeric,
  objectives_weight numeric,
  competencies_weight numeric,
  penalties_weight numeric,
  objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget jsonb,
  competencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, code)
);
CREATE INDEX appraisal_employees_cycle_idx ON public.appraisal_employees (cycle_id);
CREATE INDEX appraisal_employees_manager_idx ON public.appraisal_employees (cycle_id, manager_name);

-- 3. Penalties sheet
CREATE TABLE public.appraisal_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE,
  code text NOT NULL,
  employee_name text,
  penalties_count integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, code)
);

-- 4. Evaluations
CREATE TABLE public.appraisal_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.appraisal_employees(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  sector text,
  department text,
  objective_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  competency_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_score numeric,
  penalties_count integer NOT NULL DEFAULT 0,
  penalties_result numeric,
  objectives_result numeric,
  competencies_result numeric,
  outstanding jsonb,
  comments text,
  overall_score numeric,
  rating text,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id)
);
CREATE INDEX appraisal_evaluations_cycle_idx ON public.appraisal_evaluations (cycle_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appraisal_cycles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appraisal_employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appraisal_penalties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appraisal_evaluations TO authenticated;
GRANT ALL ON public.appraisal_cycles TO service_role;
GRANT ALL ON public.appraisal_employees TO service_role;
GRANT ALL ON public.appraisal_penalties TO service_role;
GRANT ALL ON public.appraisal_evaluations TO service_role;

ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_evaluations ENABLE ROW LEVEL SECURITY;

-- Cycles policies
CREATE POLICY "Scoped read appraisal cycles" ON public.appraisal_cycles
  FOR SELECT TO authenticated
  USING (
    app_private.is_unrestricted(auth.uid())
    OR app_private.user_can(auth.uid(), 'view_tp', company_id, NULL, NULL)
    OR app_private.user_can(auth.uid(), 'admin_tp', company_id, NULL, NULL)
  );
CREATE POLICY "Admins manage appraisal cycles" ON public.appraisal_cycles
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, NULL, NULL))
  WITH CHECK (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, NULL, NULL));

-- Employees policies
CREATE POLICY "Scoped read appraisal employees" ON public.appraisal_employees
  FOR SELECT TO authenticated
  USING (
    app_private.is_unrestricted(auth.uid())
    OR app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department)
    OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department)
  );
CREATE POLICY "Admins manage appraisal employees" ON public.appraisal_employees
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department))
  WITH CHECK (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department));

-- Penalties policies
CREATE POLICY "Scoped read appraisal penalties" ON public.appraisal_penalties
  FOR SELECT TO authenticated
  USING (
    app_private.is_unrestricted(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.appraisal_employees e
      WHERE e.cycle_id = appraisal_penalties.cycle_id AND e.code = appraisal_penalties.code
        AND (app_private.user_can(auth.uid(), 'view_tp', e.company_id, e.sector, e.department)
          OR app_private.user_can(auth.uid(), 'admin_tp', e.company_id, e.sector, e.department))
    )
  );
CREATE POLICY "Admins manage appraisal penalties" ON public.appraisal_penalties
  FOR ALL TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'owner'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appraisal_employees e
      WHERE e.cycle_id = appraisal_penalties.cycle_id AND e.code = appraisal_penalties.code
        AND app_private.user_can(auth.uid(), 'admin_tp', e.company_id, e.sector, e.department)
    )
    OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    app_private.has_role(auth.uid(), 'owner'::app_role)
    OR app_private.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appraisal_employees e
      WHERE e.cycle_id = appraisal_penalties.cycle_id AND e.code = appraisal_penalties.code
        AND app_private.user_can(auth.uid(), 'admin_tp', e.company_id, e.sector, e.department)
    )
  );

-- Evaluations policies
CREATE POLICY "Scoped read appraisal evaluations" ON public.appraisal_evaluations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR app_private.is_unrestricted(auth.uid())
    OR app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department)
    OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department)
  );
CREATE POLICY "Scoped users create appraisal evaluations" ON public.appraisal_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      app_private.is_unrestricted(auth.uid())
      OR app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department)
      OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department)
    )
  );
CREATE POLICY "Owners update own draft evaluations" ON public.appraisal_evaluations
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND status <> 'approved')
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins update appraisal evaluations" ON public.appraisal_evaluations
  FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department))
  WITH CHECK (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department));
CREATE POLICY "Only owner or deleter can delete evaluations" ON public.appraisal_evaluations
  FOR DELETE TO authenticated
  USING (app_private.can_delete(auth.uid()));

-- updated_at triggers
CREATE TRIGGER update_appraisal_cycles_updated_at BEFORE UPDATE ON public.appraisal_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appraisal_employees_updated_at BEFORE UPDATE ON public.appraisal_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appraisal_penalties_updated_at BEFORE UPDATE ON public.appraisal_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appraisal_evaluations_updated_at BEFORE UPDATE ON public.appraisal_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
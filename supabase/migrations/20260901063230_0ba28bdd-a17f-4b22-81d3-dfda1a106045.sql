-- 1) Permission flags on each scope grant
ALTER TABLE public.user_scopes
  ADD COLUMN IF NOT EXISTS can_view_jd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_tp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_jd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_create_tn boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete boolean NOT NULL DEFAULT false;

UPDATE public.user_scopes
SET can_view_jd = true, can_view_tp = true, can_create_jd = true, can_create_tn = true
WHERE can_view_jd = false AND can_view_tp = false AND can_create_jd = false AND can_create_tn = false;

-- 2) Helper functions
CREATE OR REPLACE FUNCTION app_private.is_unrestricted(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.has_role(_user_id, 'owner'::public.app_role)
     OR (app_private.has_role(_user_id, 'super_admin'::public.app_role)
         AND NOT EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _user_id));
$$;

CREATE OR REPLACE FUNCTION app_private.user_can(_user_id uuid, _perm text, _company_id uuid, _sector text, _department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.is_unrestricted(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = _user_id
        AND (s.company_id IS NULL OR _company_id IS NULL OR s.company_id = _company_id)
        AND (s.sector IS NULL OR _sector IS NULL OR s.sector = _sector)
        AND (s.department IS NULL OR _department IS NULL OR s.department = _department)
        AND CASE _perm
              WHEN 'view_jd' THEN s.can_view_jd
              WHEN 'view_tp' THEN s.can_view_tp
              WHEN 'create_jd' THEN s.can_create_jd
              WHEN 'create_tn' THEN s.can_create_tn
              WHEN 'delete' THEN s.can_delete
              WHEN 'any' THEN (s.can_view_jd OR s.can_view_tp OR s.can_create_jd OR s.can_create_tn)
              ELSE false
            END
    );
$$;

CREATE OR REPLACE FUNCTION app_private.can_see_company(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.is_unrestricted(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = _user_id
        AND (s.company_id IS NULL OR s.company_id = _company_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      JOIN public.companies c ON c.id = s.company_id
      WHERE s.user_id = _user_id AND c.parent_id = _company_id
    );
$$;

-- keep legacy helper aligned with the new model
CREATE OR REPLACE FUNCTION app_private.user_has_scope(_user_id uuid, _company_id uuid, _sector text, _department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.user_can(_user_id, 'any', _company_id, _sector, _department);
$$;

CREATE OR REPLACE FUNCTION app_private.can_delete(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.has_role(_user_id, 'owner'::public.app_role)
     OR app_private.has_role(_user_id, 'deleter'::public.app_role)
     OR EXISTS (SELECT 1 FROM public.user_scopes s WHERE s.user_id = _user_id AND s.can_delete);
$$;

GRANT EXECUTE ON FUNCTION app_private.is_unrestricted(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.user_can(uuid, text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_see_company(uuid, uuid) TO authenticated, service_role;

-- 3) Companies: only companies inside the user's scope
DROP POLICY IF EXISTS "All authenticated read companies" ON public.companies;
CREATE POLICY "Scoped read companies" ON public.companies
FOR SELECT TO authenticated
USING (app_private.can_see_company(auth.uid(), id));

DROP POLICY IF EXISTS "Owners and super admins manage companies" ON public.companies;
CREATE POLICY "Owners and super admins manage companies" ON public.companies
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.can_see_company(auth.uid(), id))
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.can_see_company(auth.uid(), id))
);

-- 4) Positions: only inside scope
DROP POLICY IF EXISTS "All authenticated read positions" ON public.positions;
CREATE POLICY "Scoped read positions" ON public.positions
FOR SELECT TO authenticated
USING (app_private.can_see_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owners and super admins manage positions" ON public.positions;
CREATE POLICY "Owners and super admins manage positions" ON public.positions
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.can_see_company(auth.uid(), company_id))
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.can_see_company(auth.uid(), company_id))
);

-- 5) Job analyses
DROP POLICY IF EXISTS "Owners super admins and scoped users view analyses" ON public.job_analyses;
CREATE POLICY "Scoped users view analyses" ON public.job_analyses
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR app_private.user_can(auth.uid(), 'view_jd', company_id, sector, department)
);

DROP POLICY IF EXISTS "Authenticated users insert own analyses" ON public.job_analyses;
CREATE POLICY "Scoped users insert analyses" ON public.job_analyses
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    app_private.is_unrestricted(auth.uid())
    OR app_private.user_can(auth.uid(), 'create_jd', company_id, sector, department)
  )
);

-- 6) Training needs
DROP POLICY IF EXISTS "Users and scoped users view training needs" ON public.training_needs;
CREATE POLICY "Scoped users view training needs" ON public.training_needs
FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department)
);

DROP POLICY IF EXISTS "Users insert own training needs" ON public.training_needs;
CREATE POLICY "Scoped users insert training needs" ON public.training_needs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    app_private.is_unrestricted(auth.uid())
    OR app_private.user_can(auth.uid(), 'create_tn', company_id, sector, department)
  )
);

DROP POLICY IF EXISTS "OD manages training needs" ON public.training_needs;
CREATE POLICY "OD manages training needs" ON public.training_needs
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department))
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department))
);

-- 7) user_scopes: an admin can only grant inside his own companies
DROP POLICY IF EXISTS "Owners and super admins manage scopes" ON public.user_scopes;
CREATE POLICY "Owners and super admins manage scopes" ON public.user_scopes
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND (company_id IS NULL OR app_private.can_see_company(auth.uid(), company_id)))
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND company_id IS NOT NULL
      AND app_private.can_see_company(auth.uid(), company_id))
);
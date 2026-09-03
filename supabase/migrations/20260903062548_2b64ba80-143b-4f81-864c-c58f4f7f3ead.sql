-- 1) Admin capability flags per scope grant
ALTER TABLE public.user_scopes
  ADD COLUMN IF NOT EXISTS can_admin_jd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_admin_tp boolean NOT NULL DEFAULT false;

-- 2) Helpers
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
              WHEN 'admin_jd' THEN s.can_admin_jd
              WHEN 'admin_tp' THEN s.can_admin_tp
              WHEN 'delete' THEN s.can_delete
              WHEN 'any' THEN (s.can_view_jd OR s.can_view_tp OR s.can_create_jd OR s.can_create_tn OR s.can_admin_jd OR s.can_admin_tp)
              ELSE false
            END
    );
$$;

-- organisational visibility: company + sector + department aware
CREATE OR REPLACE FUNCTION app_private.can_see_org(_user_id uuid, _company_id uuid, _sector text, _department text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.is_unrestricted(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = _user_id
        AND (s.company_id IS NULL OR s.company_id = _company_id)
        AND (s.sector IS NULL OR _sector IS NULL OR s.sector = _sector)
        AND (s.department IS NULL OR _department IS NULL OR s.department = _department)
    );
$$;

-- do two users share at least one company scope?
CREATE OR REPLACE FUNCTION app_private.shares_company(_admin_id uuid, _target_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, app_private AS $$
  SELECT app_private.has_role(_admin_id, 'owner'::public.app_role)
     OR app_private.is_unrestricted(_admin_id)
     OR EXISTS (
       SELECT 1
       FROM public.user_scopes a
       JOIN public.user_scopes b ON b.user_id = _target_id
        AND (a.company_id IS NULL OR b.company_id IS NULL OR a.company_id = b.company_id)
       WHERE a.user_id = _admin_id
     );
$$;

GRANT EXECUTE ON FUNCTION app_private.can_see_org(uuid, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.shares_company(uuid, uuid) TO authenticated, service_role;

-- 3) Positions scoped by sector/department too
DROP POLICY IF EXISTS "Scoped read positions" ON public.positions;
CREATE POLICY "Scoped read positions" ON public.positions
FOR SELECT TO authenticated
USING (app_private.can_see_org(auth.uid(), company_id, sector, department));

-- 4) Job analyses: scoped admins may update inside their scope
DROP POLICY IF EXISTS "Owners and super admins update analyses" ON public.job_analyses;
CREATE POLICY "Scoped admins update analyses" ON public.job_analyses
FOR UPDATE TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR app_private.user_can(auth.uid(), 'admin_jd', company_id, sector, department)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR app_private.user_can(auth.uid(), 'admin_jd', company_id, sector, department)
);

-- 5) Training needs: administering is separate from deleting
DROP POLICY IF EXISTS "OD manages training needs" ON public.training_needs;
CREATE POLICY "Scoped admins update training needs" ON public.training_needs
FOR UPDATE TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR app_private.user_can(auth.uid(), 'admin_tp', company_id, sector, department)
);

-- 6) Identity administration limited to shared companies
DROP POLICY IF EXISTS "Users view own profile owners and super admins view all" ON public.profiles;
CREATE POLICY "Scoped profile visibility" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.shares_company(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Owners and super admins manage profiles" ON public.profiles;
CREATE POLICY "Owners and scoped admins manage profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.shares_company(auth.uid(), user_id))
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.shares_company(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Users view own roles owners and super admins view all" ON public.user_roles;
CREATE POLICY "Scoped role visibility" ON public.user_roles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role) AND app_private.shares_company(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Owners and super admins manage roles" ON public.user_roles;
CREATE POLICY "Owners and scoped admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND app_private.shares_company(auth.uid(), user_id)
      AND role <> 'owner'::public.app_role
      AND role <> 'super_admin'::public.app_role)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND app_private.shares_company(auth.uid(), user_id)
      AND role <> 'owner'::public.app_role
      AND role <> 'super_admin'::public.app_role)
);

-- 7) Scoped admins may view the scope rows of users they administer
DROP POLICY IF EXISTS "Users view own scopes" ON public.user_scopes;
CREATE POLICY "Users and scoped admins view scopes" ON public.user_scopes
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR app_private.has_role(auth.uid(), 'owner'::public.app_role)
  OR (app_private.has_role(auth.uid(), 'super_admin'::public.app_role)
      AND (company_id IS NULL OR app_private.can_see_company(auth.uid(), company_id)))
);
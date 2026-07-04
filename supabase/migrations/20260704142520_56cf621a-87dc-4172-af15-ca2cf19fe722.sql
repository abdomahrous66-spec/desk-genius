ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

CREATE OR REPLACE FUNCTION public.user_has_scope(_user_id uuid, _company_id uuid, _sector text, _department text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::app_role)
    OR public.has_role(_user_id, 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = _user_id
        AND (
          (s.department IS NOT NULL AND s.department = _department)
          OR
          (s.department IS NULL AND s.sector IS NOT NULL AND s.sector = _sector
            AND (s.company_id IS NULL OR s.company_id = _company_id))
          OR
          (s.department IS NULL AND s.sector IS NULL AND s.company_id IS NOT NULL AND s.company_id = _company_id)
          OR
          (s.department IS NULL AND s.sector IS NULL AND s.company_id IS NULL)
        )
    );
$$;

DROP POLICY IF EXISTS "Admins manage companies" ON public.companies;
CREATE POLICY "Owners and super admins manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage positions" ON public.positions;
CREATE POLICY "Owners and super admins manage positions"
ON public.positions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Owners and super admins manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own profile, admins view all" ON public.profiles;
CREATE POLICY "Users view own profile owners and super admins view all"
ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Owners and super admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own roles, admins view all" ON public.user_roles;
CREATE POLICY "Users view own roles owners and super admins view all"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage scopes" ON public.user_scopes;
CREATE POLICY "Owners and super admins manage scopes"
ON public.user_scopes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update analyses" ON public.job_analyses;
CREATE POLICY "Owners and super admins update analyses"
ON public.job_analyses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete analyses" ON public.job_analyses;
CREATE POLICY "Owners and super admins delete analyses"
ON public.job_analyses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Owners admins and in-scope view analyses" ON public.job_analyses;
CREATE POLICY "Owners super admins and scoped users view analyses"
ON public.job_analyses
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR public.user_has_scope(auth.uid(), company_id, sector, department));
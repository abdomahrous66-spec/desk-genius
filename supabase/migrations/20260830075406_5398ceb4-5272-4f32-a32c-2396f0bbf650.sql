ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'deleter';

CREATE OR REPLACE FUNCTION app_private.can_delete(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('owner', 'deleter')
  )
$$;

DROP POLICY IF EXISTS "OD manages all training needs" ON public.training_needs;
CREATE POLICY "OD manages training needs"
ON public.training_needs FOR ALL TO authenticated
USING (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'owner'::app_role) OR app_private.has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Users delete own pending training needs" ON public.training_needs;

CREATE POLICY "Only owner or deleter can delete training needs"
ON public.training_needs FOR DELETE TO authenticated
USING (app_private.can_delete(auth.uid()));

DROP POLICY IF EXISTS "Owners and super admins delete analyses" ON public.job_analyses;
CREATE POLICY "Only owner or deleter can delete analyses"
ON public.job_analyses FOR DELETE TO authenticated
USING (app_private.can_delete(auth.uid()));
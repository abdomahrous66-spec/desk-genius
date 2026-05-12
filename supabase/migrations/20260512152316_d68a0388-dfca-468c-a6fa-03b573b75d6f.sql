
DROP POLICY IF EXISTS "Admins view all analyses" ON public.job_analyses;
CREATE POLICY "Owners and admins view analyses"
ON public.job_analyses FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

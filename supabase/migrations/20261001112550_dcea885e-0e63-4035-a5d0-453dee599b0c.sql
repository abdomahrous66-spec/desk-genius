CREATE POLICY "Scoped managers add appraisal employees" ON public.appraisal_employees
  FOR INSERT TO authenticated
  WITH CHECK (app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department));
CREATE POLICY "Scoped managers edit appraisal employees" ON public.appraisal_employees
  FOR UPDATE TO authenticated
  USING (app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department))
  WITH CHECK (app_private.user_can(auth.uid(), 'view_tp', company_id, sector, department));
CREATE POLICY "Super admins manage appraisal cycles" ON public.appraisal_cycles
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'super_admin'::app_role));
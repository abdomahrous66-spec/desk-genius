CREATE POLICY "Owners update own analyses"
ON public.job_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
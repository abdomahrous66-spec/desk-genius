CREATE OR REPLACE FUNCTION public.user_has_scope(_user_id uuid, _company_id uuid, _sector text, _department text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR NOT EXISTS (SELECT 1 FROM public.user_scopes WHERE user_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_scopes s
      WHERE s.user_id = _user_id
        AND (
          -- Department-level scope: match by department only (any company/sector)
          (s.department IS NOT NULL AND s.department = _department)
          OR
          -- Sector-level scope (no department): match by sector, optional company
          (s.department IS NULL AND s.sector IS NOT NULL AND s.sector = _sector
            AND (s.company_id IS NULL OR s.company_id = _company_id))
          OR
          -- Company-level scope only
          (s.department IS NULL AND s.sector IS NULL AND s.company_id IS NOT NULL AND s.company_id = _company_id)
          OR
          -- Fully wildcard row
          (s.department IS NULL AND s.sector IS NULL AND s.company_id IS NULL)
        )
    );
$$;

CREATE TABLE public.user_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sector TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sector, department)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_scopes TO authenticated;
GRANT ALL ON public.user_scopes TO service_role;

ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scopes" ON public.user_scopes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own scopes" ON public.user_scopes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

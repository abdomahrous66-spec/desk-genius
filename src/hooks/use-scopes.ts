import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Scope = {
  company_id: string | null;
  sector: string | null;
  department: string | null;
};

/**
 * Current user's allowed scopes.
 * - owner/super_admin or no rows → unrestricted (allowed = null)
 * - else allowed = list of scope rows. NULL fields = wildcard.
 */
export function useScopes() {
  const auth = useAuth();
  const [scopes, setScopes] = useState<Scope[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { setScopes(null); setLoading(false); return; }
    if (auth.isSuperAdmin) { setScopes(null); setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: Scope[] | null }> } };
      }).from("user_scopes").select("company_id,sector,department").eq("user_id", auth.user!.id);
      setScopes(data && data.length > 0 ? data : null);
      setLoading(false);
    })();
  }, [auth.loading, auth.user, auth.role]);

  const isAllowed = (companyId?: string | null, sector?: string | null, department?: string | null) => {
    if (!scopes) return true;
    return scopes.some(s =>
      (s.company_id === null || !companyId || s.company_id === companyId) &&
      (s.sector === null || !sector || s.sector === sector) &&
      (s.department === null || !department || s.department === department)
    );
  };

  return { scopes, loading, isAllowed, isRestricted: !!scopes };
}

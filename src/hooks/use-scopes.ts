import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Scope = { sector: string; department: string | null };

/** Returns the current user's allowed scopes.
 *  - admin: unrestricted (allowed = null)
 *  - manager with no rows: unrestricted (allowed = null) — backward compatible
 *  - manager with rows: allowed = list of {sector, department|null}
 */
export function useScopes() {
  const auth = useAuth();
  const [scopes, setScopes] = useState<Scope[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { setScopes(null); setLoading(false); return; }
    if (auth.role === "admin") { setScopes(null); setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as unknown as {
        from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: Scope[] | null }> } };
      }).from("user_scopes").select("sector,department").eq("user_id", auth.user!.id);
      setScopes(data && data.length > 0 ? data : null);
      setLoading(false);
    })();
  }, [auth.loading, auth.user, auth.role]);

  const isAllowed = (sector: string, department?: string | null) => {
    if (!scopes) return true;
    return scopes.some(s =>
      s.sector === sector && (s.department === null || !department || s.department === department)
    );
  };

  return { scopes, loading, isAllowed, isRestricted: !!scopes };
}

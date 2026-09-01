import { useAuth, type ScopeGrant } from "@/hooks/use-auth";

export type Scope = ScopeGrant;
export type Perm = "can_view_jd" | "can_view_tp" | "can_create_jd" | "can_create_tn" | "can_delete";

/**
 * Current user's allowed scopes + per-scope permissions.
 * - owner / super admin without scope rows → unrestricted (scopes = null)
 * - otherwise access is limited to the listed grants. NULL fields = wildcard.
 */
export function useScopes() {
  const auth = useAuth();
  const scopes: Scope[] | null = auth.unrestricted || auth.scopes.length === 0 ? null : auth.scopes;

  const match = (s: Scope, companyId?: string | null, sector?: string | null, department?: string | null) =>
    (s.company_id === null || !companyId || s.company_id === companyId) &&
    (s.sector === null || !sector || s.sector === sector) &&
    (s.department === null || !department || s.department === department);

  const isAllowed = (companyId?: string | null, sector?: string | null, department?: string | null) => {
    if (!scopes) return true;
    return scopes.some(s => match(s, companyId, sector, department));
  };

  /** Permission check inside a given company/sector/department. */
  const can = (perm: Perm, companyId?: string | null, sector?: string | null, department?: string | null) => {
    if (!scopes) return true;
    return scopes.some(s => match(s, companyId, sector, department) && Boolean(s[perm]));
  };

  /** Company ids the user may see at all (null = every company). */
  const allowedCompanyIds: string[] | null = !scopes
    ? null
    : scopes.some(s => s.company_id === null)
      ? null
      : Array.from(new Set(scopes.map(s => s.company_id!).filter(Boolean)));

  return { scopes, loading: auth.loading, isAllowed, can, allowedCompanyIds, isRestricted: !!scopes };
}

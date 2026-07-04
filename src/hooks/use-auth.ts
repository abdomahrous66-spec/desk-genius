import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "viewer" | "manager" | "admin" | "super_admin" | "owner" | null;

export interface AuthState {
  loading: boolean;
  user: User | null;
  role: Role;               // effective role: owner > super_admin > admin/manager > viewer
  roles: string[];          // all roles the user holds
  isAdmin: boolean;         // can create/view job descriptions
  isSuperAdmin: boolean;
  isOwner: boolean;
  canCreateJD: boolean;
  canManageUsers: boolean;
  canManageStructure: boolean;
  username: string | null;
}

const DEFAULT: AuthState = {
  loading: true, user: null, role: null, roles: [],
  isAdmin: false, isSuperAdmin: false, isOwner: false,
  canCreateJD: false, canManageUsers: false, canManageStructure: false,
  username: null,
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(DEFAULT);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (user: User | null) => {
      if (!user) {
        if (mounted) setState({ ...DEFAULT, loading: false });
        return;
      }
      setTimeout(async () => {
        const [{ data: roleRows }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!mounted) return;
        const roles = (roleRows ?? []).map(r => r.role as string);
        const isOwner = roles.includes("owner");
        const isSuperAdmin = isOwner || roles.includes("super_admin");
        const canCreateJD = isSuperAdmin || roles.includes("admin") || roles.includes("manager");
        const isAdmin = canCreateJD;
        const canManageUsers = isOwner || roles.includes("super_admin");
        const canManageStructure = canManageUsers;
        const effective: Role = isOwner
          ? "owner"
          : roles.includes("super_admin")
            ? "super_admin"
            : roles.includes("admin")
              ? "admin"
              : roles.includes("manager")
                ? "manager"
                : roles.includes("viewer")
                  ? "viewer"
                  : null;
        setState({
          loading: false, user, role: effective, roles,
          isAdmin, isSuperAdmin, isOwner, canCreateJD, canManageUsers, canManageStructure,
          username: profile?.username ?? null,
        });
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => loadRole(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => loadRole(data.session?.user ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}

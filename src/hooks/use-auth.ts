import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "manager" | "super_admin" | null;

export interface AuthState {
  loading: boolean;
  user: User | null;
  role: Role;               // effective role: super_admin > admin > manager
  roles: string[];          // all roles the user holds
  isAdmin: boolean;         // admin OR super_admin
  isSuperAdmin: boolean;
  username: string | null;
}

const DEFAULT: AuthState = {
  loading: true, user: null, role: null, roles: [],
  isAdmin: false, isSuperAdmin: false, username: null,
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
        const isSuperAdmin = roles.includes("super_admin");
        const isAdmin = isSuperAdmin || roles.includes("admin");
        const effective: Role = isSuperAdmin ? "super_admin" : isAdmin ? "admin" : (roles[0] as Role) ?? null;
        setState({
          loading: false, user, role: effective, roles,
          isAdmin, isSuperAdmin, username: profile?.username ?? null,
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

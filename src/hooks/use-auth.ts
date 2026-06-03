import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "manager" | null;

export interface AuthState {
  loading: boolean;
  user: User | null;
  role: Role;
  username: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true, user: null, role: null, username: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadRole = async (user: User | null) => {
      if (!user) {
        if (mounted) setState({ loading: false, user: null, role: null, username: null });
        return;
      }
      // Defer DB calls to avoid deadlocks inside auth callback
      setTimeout(async () => {
        const [{ data: roleRow }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
          supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!mounted) return;
        setState({
          loading: false,
          user,
          role: (roleRow?.role as Role) ?? null,
          username: profile?.username ?? null,
        });
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      loadRole(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => loadRole(data.session?.user ?? null));

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}

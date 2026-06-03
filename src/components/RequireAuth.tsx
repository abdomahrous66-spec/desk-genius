import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type Role } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function RequireAuth({
  children, requireRole,
}: { children: React.ReactNode; requireRole?: Role }) {
  const auth = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { nav({ to: "/login" }); return; }
    if (!auth.role) { nav({ to: "/login" }); return; }
    if (requireRole && auth.role !== requireRole) { nav({ to: "/" }); }
  }, [auth, requireRole, nav]);

  if (auth.loading || !auth.user || !auth.role || (requireRole && auth.role !== requireRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}

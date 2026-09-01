import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type Role, type AuthState } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export type Capability =
  | "viewJD" | "createJD" | "createTN" | "viewTP" | "manageStructure" | "manageUsers" | "delete";

const CAP_MAP: Record<Capability, keyof AuthState> = {
  viewJD: "canViewJD",
  createJD: "canCreateJD",
  createTN: "canTraining",
  viewTP: "canViewTP",
  manageStructure: "canManageStructure",
  manageUsers: "canManageUsers",
  delete: "canDelete",
};

export function RequireAuth({
  children, requireRole, requireCap,
}: { children: React.ReactNode; requireRole?: Role; requireCap?: Capability }) {
  const auth = useAuth();
  const nav = useNavigate();

  const roleOk =
    !requireRole ||
    auth.role === requireRole ||
    (requireRole === "admin" && auth.isAdmin) ||
    (requireRole === "super_admin" && auth.isSuperAdmin) ||
    (requireRole === "owner" && auth.isOwner) ||
    (requireRole === "training" && auth.canTraining);
  const capOk = !requireCap || Boolean(auth[CAP_MAP[requireCap]]);
  const ok = roleOk && capOk;

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) { nav({ to: "/login" }); return; }
    if (!ok) { nav({ to: "/" }); }
  }, [auth, ok, nav]);

  if (auth.loading || !auth.user || !ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}

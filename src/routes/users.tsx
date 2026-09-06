import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Plus, Trash2, UserPlus, Shield } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useStructure } from "@/hooks/use-structure";
import { useAuth } from "@/hooks/use-auth";
import { useLang, useT } from "@/hooks/use-i18n";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Access & Permissions | Nahdet Misr HR" },
      { name: "description", content: "Create users and grant scoped View, Create, and Admin permissions per company, sector, and department." },
      { property: "og:title", content: "User Access & Permissions" },
      { property: "og:description", content: "Grant scoped View, Create, and Admin permissions per company, sector, and department." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth requireRole="super_admin">
      <UsersPage />
    </RequireAuth>
  ),
});

const DICT = {
  en: {
    home: "Home", title: "User Management",
    subtitle: "Create users and grant scoped View, Create, and Admin permissions.",
    newUser: "New user", username: "Username", fullName: "Full name", password: "Password",
    role: "Base role", add: "Add", viewerRole: "Standard user", trainingRole: "Training (TN)",
    deleterRole: "Can delete records", superRole: "Super Admin", ownerOnly: "Only the Owner can create a Super Admin.",
    permissions: "Permissions", noScope: "No access granted yet", grantsOn: "grant(s)",
    deleteUser: "Delete user", deleteUserDesc: 'This permanently deletes "{u}".',
    cancel: "Cancel", del: "Delete", save: "Save",
    dlgTitle: "Permissions for {u}",
    dlgDesc: "Pick a company, choose the sectors/departments, then allow View, Create, and Admin actions. Saved per company.",
    company: "Company", pickCompany: "Select a company",
    groupView: "View", groupCreate: "Create", groupAdmin: "Admin",
    viewJD: "View job descriptions (JD)", viewTP: "View training plan (TP)",
    createJD: "Create job description (JD)", createTN: "Register training need (TN)",
    adminJD: "Administer JD (review & edit others)", adminTP: "Administer training (TP)",
    canDelete: "Allow deleting records",
    scopeHint: "These permissions apply only to the sectors/departments selected below.",
    allDepts: "— all departments", noSector: "(no sector)", noData: "No structure data for this company.",
    counts: "{s} sector(s) · {d} item(s)", pickCompanyFirst: "Select a company",
    saved: "Permissions saved", saveFailed: "Could not save permissions",
    created: "User created", createFailed: "Could not create user",
    deleted: "User deleted", deleteFailed: "Could not delete user",
  },
  ar: {
    home: "الرئيسية", title: "إدارة المستخدمين",
    subtitle: "أنشئ مستخدمين وامنح صلاحيات عرض وإنشاء وإدارة داخل نطاق محدد.",
    newUser: "مستخدم جديد", username: "اسم المستخدم", fullName: "الاسم الكامل", password: "كلمة المرور",
    role: "الدور الأساسي", add: "إضافة", viewerRole: "مستخدم عادي", trainingRole: "تدريب (TN)",
    deleterRole: "يقدر يحذف السجلات", superRole: "سوبر أدمن", ownerOnly: "إنشاء سوبر أدمن متاح للمالك فقط.",
    permissions: "الصلاحيات", noScope: "لا توجد صلاحيات ممنوحة", grantsOn: "صلاحية",
    deleteUser: "حذف المستخدم", deleteUserDesc: 'سيتم حذف "{u}" نهائياً.',
    cancel: "إلغاء", del: "حذف", save: "حفظ",
    dlgTitle: "صلاحيات {u}",
    dlgDesc: "اختر الشركة ثم القطاعات/الإدارات، وحدد صلاحيات العرض والإنشاء والإدارة. تُحفظ لكل شركة على حدة.",
    company: "الشركة", pickCompany: "اختر الشركة",
    groupView: "عرض", groupCreate: "إنشاء", groupAdmin: "إدارة",
    viewJD: "عرض الوصف الوظيفي (JD)", viewTP: "عرض خطة التدريب (TP)",
    createJD: "إنشاء وصف وظيفي (JD)", createTN: "تسجيل احتياج تدريبي (TN)",
    adminJD: "إدارة الوصف الوظيفي (مراجعة وتعديل)", adminTP: "إدارة التدريب (TP)",
    canDelete: "السماح بحذف السجلات",
    scopeHint: "الصلاحيات دي بتتطبق على القطاعات/الإدارات المختارة تحت فقط.",
    allDepts: "— كل الإدارات", noSector: "(بدون قطاع)", noData: "لا توجد بيانات هيكل لهذه الشركة.",
    counts: "{s} قطاع · {d} عنصر", pickCompanyFirst: "اختر شركة",
    saved: "تم حفظ الصلاحيات", saveFailed: "فشل حفظ الصلاحيات",
    created: "تم إنشاء المستخدم", createFailed: "فشل إنشاء المستخدم",
    deleted: "تم حذف المستخدم", deleteFailed: "فشل الحذف",
  },
} as const;

type Manager = { user_id: string; username: string; display_name: string | null; created_at: string; roles: string[] };
type PermKey =
  | "can_view_jd" | "can_view_tp" | "can_create_jd" | "can_create_tn"
  | "can_admin_jd" | "can_admin_tp" | "can_delete";
type ScopeRow = {
  user_id: string; company_id: string | null; sector: string | null; department: string | null;
} & Partial<Record<PermKey, boolean>>;

const EMPTY_PERMS: Record<PermKey, boolean> = {
  can_view_jd: false, can_view_tp: false, can_create_jd: false, can_create_tn: false,
  can_admin_jd: false, can_admin_tp: false, can_delete: false,
};
const PERM_KEYS = Object.keys(EMPTY_PERMS) as PermKey[];
const SCOPE_COLS =
  "user_id,company_id,sector,department,can_view_jd,can_view_tp,can_create_jd,can_create_tn,can_admin_jd,can_admin_tp,can_delete";

type AssignableRole = "viewer" | "training" | "deleter" | "super_admin";

const scopesTable = () => (supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => Promise<{ data: ScopeRow[] | null }>;
    insert: (rows: ScopeRow[]) => Promise<{ error: unknown }>;
  };
}).from("user_scopes");

function UsersPage() {
  const auth = useAuth();
  const { dir } = useLang();
  const t = useT(DICT as unknown as { en: Record<string, string>; ar: Record<string, string> });
  const [rows, setRows] = useState<Manager[]>([]);
  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<AssignableRole>("viewer");

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
    const map = new Map<string, Manager>();
    for (const r of roles ?? []) {
      const cur = map.get(r.user_id);
      if (cur) cur.roles.push(r.role);
      else map.set(r.user_id, { user_id: r.user_id, roles: [r.role], created_at: r.created_at, username: "—", display_name: null });
    }
    const ids = Array.from(map.keys());
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", ids);
    for (const p of profiles ?? []) {
      const m = map.get(p.user_id);
      if (m) { m.username = p.username ?? "—"; m.display_name = p.display_name ?? null; }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const rank = (r: string[]) => r.includes("owner") ? 0 : r.includes("super_admin") ? 1 : r.includes("admin") ? 2 : 3;
      return rank(a.roles) - rank(b.roles);
    });
    setRows(merged);
    const { data: sc } = await scopesTable().select(SCOPE_COLS);
    setScopes(sc ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { username: username.trim(), password, display_name: displayName.trim() || username.trim(), role: newRole },
    });
    setCreating(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || t.createFailed);
      return;
    }
    toast.success(t.created);
    setUsername(""); setDisplayName(""); setPassword(""); setNewRole("viewer");
    load();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { target_user_id: id } });
    setDeletingId(null);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || t.deleteFailed);
      return;
    }
    toast.success(t.deleted); load();
  };

  const permLabel: Record<PermKey, string> = {
    can_view_jd: t.viewJD, can_view_tp: t.viewTP,
    can_create_jd: t.createJD, can_create_tn: t.createTN,
    can_admin_jd: t.adminJD, can_admin_tp: t.adminTP, can_delete: t.canDelete,
  };

  return (
    <div className="min-h-screen py-8 md:py-12" dir={dir}>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> {t.home}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t.title}</h1>
        <p className="text-muted-foreground mb-6">{t.subtitle}</p>

        <Card className="bg-gradient-card p-6 shadow-soft mb-8">
          <h2 className="font-bold text-lg mb-4 inline-flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> {t.newUser}
          </h2>
          <form onSubmit={create} className="grid md:grid-cols-5 gap-3 items-end">
            <div>
              <Label>{t.username} *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ahmed123" required />
            </div>
            <div>
              <Label>{t.fullName}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ahmed Mohamed" />
            </div>
            <div>
              <Label>{t.password} *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label>{t.role}</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AssignableRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t.viewerRole}</SelectItem>
                  <SelectItem value="training">{t.trainingRole}</SelectItem>
                  <SelectItem value="deleter">{t.deleterRole}</SelectItem>
                  {auth.isOwner && <SelectItem value="super_admin">{t.superRole}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> {t.add}</>}
            </Button>
          </form>
          {!auth.isOwner && <p className="text-xs text-muted-foreground mt-2">{t.ownerOnly}</p>}
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const userScopes = scopes.filter(s => s.user_id === r.user_id);
              const isOwner = r.roles.includes("owner");
              const isSuper = !isOwner && r.roles.includes("super_admin");
              const canScope = !isOwner && !isSuper;
              const canDelete =
                r.user_id !== auth.user?.id && !isOwner &&
                (auth.isOwner || (!isSuper && auth.isSuperAdmin));
              const activePerms = PERM_KEYS.filter(k => userScopes.some(s => s[k]));
              return (
                <Card key={r.user_id} className="bg-gradient-card p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold inline-flex items-center gap-2">
                        {r.username}
                        {isOwner && <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Owner</span>}
                        {isSuper && <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Super Admin</span>}
                      </div>
                      {r.display_name && <div className="text-sm text-muted-foreground">{r.display_name}</div>}
                      {canScope && (
                        <div className="text-xs text-muted-foreground mt-1 space-y-1">
                          <div>{userScopes.length === 0 ? t.noScope : `${userScopes.length} ${t.grantsOn}`}</div>
                          {activePerms.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {activePerms.map(k => (
                                <span key={k} className="bg-primary/10 text-primary px-2 py-0.5 rounded">{permLabel[k]}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {canScope && (
                        <ScopesDialog userId={r.user_id} username={r.username} currentScopes={userScopes} onSaved={load} />
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === r.user_id}>
                              {deletingId === r.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir={dir}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.deleteUser}</AlertDialogTitle>
                              <AlertDialogDescription>{t.deleteUserDesc.replace("{u}", r.username)}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(r.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.del}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScopesDialog({ userId, username, currentScopes, onSaved }: {
  userId: string; username: string; currentScopes: ScopeRow[]; onSaved: () => void;
}) {
  const auth = useAuth();
  const { dir } = useLang();
  const t = useT(DICT as unknown as { en: Record<string, string>; ar: Record<string, string> });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { companies, tree, loading } = useStructure();

  // A delegated admin can only grant inside the companies the Owner opened for them.
  const allowedCompanyIds = useMemo<string[] | null>(() => {
    if (auth.unrestricted) return null;
    const ids = auth.scopes.map(s => s.company_id).filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [auth.unrestricted, auth.scopes]);

  const childCompanies = useMemo(
    () => companies.filter(c => c.parent_id).filter(c => !allowedCompanyIds || allowedCompanyIds.includes(c.id)),
    [companies, allowedCompanyIds],
  );

  const [companyId, setCompanyId] = useState<string>("");
  const [selection, setSelection] = useState<Record<string, Set<string>>>({});
  const [perms, setPerms] = useState<Record<PermKey, boolean>>({ ...EMPTY_PERMS });

  const hydrate = (cid: string) => {
    const map: Record<string, Set<string>> = {};
    const p: Record<PermKey, boolean> = { ...EMPTY_PERMS };
    for (const s of currentScopes) {
      if (s.company_id !== cid) continue;
      const sec = s.sector || "*";
      if (!map[sec]) map[sec] = new Set();
      map[sec].add(s.department ?? "*");
      for (const k of PERM_KEYS) if (s[k]) p[k] = true;
    }
    setSelection(map);
    setPerms(p);
  };

  useEffect(() => {
    if (!open) return;
    const withScopes = Array.from(new Set(currentScopes.map(s => s.company_id).filter(Boolean))) as string[];
    const preferred = withScopes.find(id => childCompanies.some(c => c.id === id));
    const cid = preferred || childCompanies[0]?.id || "";
    setCompanyId(cid);
    hydrate(cid);
  }, [open, currentScopes, childCompanies]);

  useEffect(() => {
    if (!open || !companyId) return;
    hydrate(companyId);
  }, [companyId]);

  const sectorList = useMemo(() => {
    if (!companyId) return [] as string[];
    const branch = tree[companyId] ?? {};
    // Delegated admins can only grant sectors they hold themselves.
    const mine = auth.unrestricted ? null : auth.scopes.filter(s => !s.company_id || s.company_id === companyId);
    const allowSector = (sector: string) =>
      !mine || mine.some(s => s.sector === null || s.sector === sector);
    return Object.keys(branch).filter(allowSector).sort();
  }, [companyId, tree, auth.unrestricted, auth.scopes]);

  const allowDept = (sector: string, dept: string) => {
    if (auth.unrestricted) return true;
    return auth.scopes.some(s =>
      (!s.company_id || s.company_id === companyId) &&
      (s.sector === null || s.sector === sector) &&
      (s.department === null || s.department === dept));
  };

  const setPerm = (k: PermKey, v: boolean) =>
    setPerms(prev => {
      const next = { ...prev, [k]: v };
      // Creating implies the matching minimum view; administering implies viewing too.
      if (k === "can_create_jd" && v) next.can_view_jd = true;
      if (k === "can_admin_jd" && v) next.can_view_jd = true;
      if (k === "can_create_tn" && v) next.can_view_tp = true;
      if (k === "can_admin_tp" && v) next.can_view_tp = true;
      return next;
    });

  const toggleAll = (sector: string) => {
    setSelection(prev => {
      const next = { ...prev };
      if (next[sector]?.has("*")) delete next[sector];
      else next[sector] = new Set(["*"]);
      return next;
    });
  };
  const toggleDept = (sector: string, dept: string) => {
    setSelection(prev => {
      const next = { ...prev };
      const set = new Set(next[sector] || []);
      set.delete("*");
      if (set.has(dept)) set.delete(dept); else set.add(dept);
      if (set.size === 0) delete next[sector];
      else next[sector] = set;
      return next;
    });
  };

  const totalDepts = useMemo(() => Object.values(selection).reduce((sum, s) => sum + s.size, 0), [selection]);

  const save = async () => {
    if (!companyId) { toast.error(t.pickCompanyFirst); return; }
    setSaving(true);
    const { error: delErr } = await (supabase as unknown as {
      from: (tb: string) => { delete: () => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    }).from("user_scopes").delete().eq("user_id", userId).eq("company_id", companyId);
    if (delErr) { toast.error(t.saveFailed); setSaving(false); return; }
    const rowsToInsert: ScopeRow[] = [];
    for (const [sector, depts] of Object.entries(selection)) {
      for (const d of depts) {
        rowsToInsert.push({
          user_id: userId,
          company_id: companyId,
          sector: sector === "*" ? null : sector,
          department: d === "*" ? null : d,
          ...perms,
        });
      }
    }
    if (rowsToInsert.length > 0) {
      const { error: insErr } = await scopesTable().insert(rowsToInsert);
      if (insErr) { toast.error(t.saveFailed); setSaving(false); return; }
    }
    setSaving(false);
    setOpen(false);
    toast.success(t.saved);
    onSaved();
  };

  const groups: { title: string; items: { key: PermKey; label: string }[] }[] = [
    { title: t.groupView, items: [{ key: "can_view_jd", label: t.viewJD }, { key: "can_view_tp", label: t.viewTP }] },
    { title: t.groupCreate, items: [{ key: "can_create_jd", label: t.createJD }, { key: "can_create_tn", label: t.createTN }] },
    {
      title: t.groupAdmin,
      items: [
        { key: "can_admin_jd", label: t.adminJD },
        { key: "can_admin_tp", label: t.adminTP },
        ...(auth.isOwner || auth.canDelete ? [{ key: "can_delete" as PermKey, label: t.canDelete }] : []),
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="w-4 h-4" /> {t.permissions}
        </Button>
      </DialogTrigger>
      <DialogContent dir={dir} className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.dlgTitle.replace("{u}", username)}</DialogTitle>
          <DialogDescription>{t.dlgDesc}</DialogDescription>
        </DialogHeader>

        <div className="my-3">
          <Label className="text-xs">{t.company}</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger><SelectValue placeholder={t.pickCompany} /></SelectTrigger>
            <SelectContent>
              {childCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {groups.map(g => (
            <Card key={g.title} className="p-3 bg-muted/30">
              <div className="font-semibold text-sm mb-2">{g.title}</div>
              <div className="space-y-2">
                {g.items.map(item => (
                  <label key={item.key} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={perms[item.key]}
                      onCheckedChange={(v) => setPerm(item.key, Boolean(v))}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t.scopeHint}</p>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3 py-3">
            {sectorList.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">{t.noData}</div>
            ) : sectorList.map((sector) => {
              const depts = Object.keys(tree[companyId][sector]).filter(d => d !== "-" && allowDept(sector, d)).sort();
              const sectorSel = selection[sector] || new Set<string>();
              const allChecked = sectorSel.has("*");
              const sectorLabel = sector === "-" ? t.noSector : sector;
              return (
                <Card key={sector} className="p-3">
                  <label className="flex items-center gap-2 font-semibold">
                    <Checkbox checked={allChecked} onCheckedChange={() => toggleAll(sector)} />
                    <span>{sectorLabel}</span>
                    <span className="text-xs text-muted-foreground font-normal">{t.allDepts}</span>
                  </label>
                  {!allChecked && depts.length > 0 && (
                    <div className="mt-3 ms-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {depts.map((d) => (
                        <label key={d} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={sectorSel.has(d)} onCheckedChange={() => toggleDept(sector, d)} />
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t.counts.replace("{s}", String(Object.keys(selection).length)).replace("{d}", String(totalDepts))}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t.cancel}</Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t.save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

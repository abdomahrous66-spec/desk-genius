import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Loader2, Plus, Trash2, UserPlus, Shield } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import positionsData from "@/data/positions.json";

const POSITIONS = positionsData as Record<string, Record<string, string[]>>;
const ALL_SECTORS = Object.keys(POSITIONS).sort();

export const Route = createFileRoute("/users")({
  component: () => (
    <RequireAuth requireRole="admin">
      <UsersPage />
    </RequireAuth>
  ),
});

type Manager = { user_id: string; username: string; display_name: string | null; created_at: string; role: string };
type ScopeRow = { user_id: string; sector: string; department: string | null };

// Loose typed accessor (user_scopes not in generated types yet)
const scopesTable = () => (supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => Promise<{ data: ScopeRow[] | null }>;
    delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
    insert: (rows: Omit<ScopeRow, never>[]) => Promise<{ error: unknown }>;
  };
}).from("user_scopes");

function UsersPage() {
  const [rows, setRows] = useState<Manager[]>([]);
  const [scopes, setScopes] = useState<ScopeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", ids);
    const merged: Manager[] = (roles ?? []).map((r) => {
      const p = profiles?.find((x) => x.user_id === r.user_id);
      return {
        user_id: r.user_id, role: r.role,
        username: p?.username ?? "—", display_name: p?.display_name ?? null,
        created_at: r.created_at,
      };
    }).sort((a, b) => a.role === "admin" ? -1 : b.role === "admin" ? 1 : 0);
    setRows(merged);
    const { data: sc } = await scopesTable().select("user_id,sector,department");
    setScopes(sc ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { username: username.trim(), password, display_name: displayName.trim() || username.trim() },
    });
    setCreating(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "فشل إنشاء المستخدم");
      return;
    }
    toast.success("تم إنشاء المستخدم");
    setUsername(""); setDisplayName(""); setPassword("");
    load();
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { target_user_id: id } });
    setDeletingId(null);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || "فشل الحذف");
      return;
    }
    toast.success("تم الحذف"); load();
  };

  return (
    <div className="min-h-screen py-8 md:py-12" dir="rtl">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </Link>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">إدارة المستخدمين</h1>
        <p className="text-muted-foreground mb-6">أنشئ يوزر وكلمة مرور لكل مدير، وحدد القطاعات/الإدارات اللي مسموح يشوفها.</p>

        <Card className="bg-gradient-card p-6 shadow-soft mb-8">
          <h2 className="font-bold text-lg mb-4 inline-flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> مستخدم جديد
          </h2>
          <form onSubmit={create} className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>اسم المستخدم *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ahmed123" required />
            </div>
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="أحمد محمد" />
            </div>
            <div>
              <Label>كلمة المرور *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" required minLength={6} />
            </div>
            <Button type="submit" disabled={creating} className="bg-primary text-primary-foreground">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 ml-1" /> إضافة</>}
            </Button>
          </form>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const userScopes = scopes.filter(s => s.user_id === r.user_id);
              return (
                <Card key={r.user_id} className="bg-gradient-card p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold">{r.username} {r.role === "admin" && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mr-2">Admin</span>}</div>
                      {r.display_name && <div className="text-sm text-muted-foreground">{r.display_name}</div>}
                      {r.role !== "admin" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {userScopes.length === 0 ? "بدون قيود — يقدر يشوف كل الهيكل" : `صلاحيات على ${userScopes.length} عنصر`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.role !== "admin" && (
                        <ScopesDialog userId={r.user_id} username={r.username} currentScopes={userScopes} onSaved={load} />
                      )}
                      {r.role !== "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={deletingId === r.user_id}>
                              {deletingId === r.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
                              <AlertDialogDescription>هتحذف "{r.username}" نهائياً ومش هيقدر يدخل تاني.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(r.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
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

function ScopesDialog({
  userId, username, currentScopes, onSaved,
}: { userId: string; username: string; currentScopes: ScopeRow[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Map: sector -> Set of allowed departments. Special "*" = all departments in sector.
  const [selection, setSelection] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!open) return;
    const map: Record<string, Set<string>> = {};
    for (const s of currentScopes) {
      if (!map[s.sector]) map[s.sector] = new Set();
      map[s.sector].add(s.department ?? "*");
    }
    setSelection(map);
  }, [open, currentScopes]);

  const toggleAll = (sector: string) => {
    setSelection(prev => {
      const next = { ...prev };
      if (next[sector]?.has("*")) {
        delete next[sector];
      } else {
        next[sector] = new Set(["*"]);
      }
      return next;
    });
  };

  const toggleDept = (sector: string, dept: string) => {
    setSelection(prev => {
      const next = { ...prev };
      const set = new Set(next[sector] || []);
      set.delete("*"); // unselecting "all" if picking specific
      if (set.has(dept)) set.delete(dept); else set.add(dept);
      if (set.size === 0) delete next[sector];
      else next[sector] = set;
      return next;
    });
  };

  const totalDepts = useMemo(() => Object.values(selection).reduce((sum, s) => sum + s.size, 0), [selection]);

  const save = async () => {
    setSaving(true);
    const { error: delErr } = await scopesTable().delete().eq("user_id", userId);
    if (delErr) { toast.error("فشل حفظ الصلاحيات"); setSaving(false); return; }
    const rows: { user_id: string; sector: string; department: string | null }[] = [];
    for (const [sector, depts] of Object.entries(selection)) {
      for (const d of depts) {
        rows.push({ user_id: userId, sector, department: d === "*" ? null : d });
      }
    }
    if (rows.length > 0) {
      const { error: insErr } = await scopesTable().insert(rows);
      if (insErr) { toast.error("فشل حفظ الصلاحيات"); setSaving(false); return; }
    }
    setSaving(false);
    setOpen(false);
    toast.success("تم حفظ الصلاحيات");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Shield className="w-4 h-4" /> الصلاحيات
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>صلاحيات {username}</DialogTitle>
          <DialogDescription>
            اختار القطاعات والإدارات اللي مسموح للمدير يشوفها ويعمل JD لها. لو سيبتها كلها فاضية، هيشوف كل الهيكل.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {ALL_SECTORS.map((sector) => {
            const depts = Object.keys(POSITIONS[sector]).filter(d => d !== "-").sort();
            const sectorSel = selection[sector] || new Set();
            const allChecked = sectorSel.has("*");
            return (
              <Card key={sector} className="p-3">
                <label className="flex items-center gap-2 font-semibold">
                  <Checkbox checked={allChecked} onCheckedChange={() => toggleAll(sector)} />
                  <span>{sector}</span>
                  <span className="text-xs text-muted-foreground font-normal">— كل الإدارات</span>
                </label>
                {!allChecked && depts.length > 0 && (
                  <div className="mt-3 mr-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {Object.keys(selection).length} قطاع · {totalDepts} عنصر
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

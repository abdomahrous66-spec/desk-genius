import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/users")({
  component: () => (
    <RequireAuth requireRole="admin">
      <UsersPage />
    </RequireAuth>
  ),
});

type Manager = { user_id: string; username: string; display_name: string | null; created_at: string; role: string };

function UsersPage() {
  const [rows, setRows] = useState<Manager[]>([]);
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
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "فشل إنشاء المستخدم");
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
    if (error || (data as any)?.error) { toast.error((data as any)?.error || "فشل الحذف"); return; }
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
        <p className="text-muted-foreground mb-6">أنشئ يوزر وكلمة مرور لكل مدير علشان يقدر يدخل ويعمل تحليل وظيفي</p>

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
            {rows.map((r) => (
              <Card key={r.user_id} className="bg-gradient-card p-4 shadow-soft flex items-center justify-between">
                <div>
                  <div className="font-bold">{r.username} {r.role === "admin" && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded mr-2">Admin</span>}</div>
                  {r.display_name && <div className="text-sm text-muted-foreground">{r.display_name}</div>}
                </div>
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

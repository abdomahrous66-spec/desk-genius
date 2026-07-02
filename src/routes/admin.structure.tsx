import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, Plus, Trash2, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { useStructure, type Position } from "@/hooks/use-structure";

export const Route = createFileRoute("/admin/structure")({
  component: () => (<RequireAuth><AdminStructurePage /></RequireAuth>),
});

type Row = {
  company_id: string;
  sector: string;
  department: string;
  section: string;
  subsection: string;
  position_title: string;
  manager_position?: string;
  job_code?: string;
};

function AdminStructurePage() {
  const auth = useAuth();
  const { companies, positions, reload, loading } = useStructure();
  const childCompanies = useMemo(() => companies.filter(c => c.parent_id), [companies]);
  const [companyId, setCompanyId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add-row form
  const [newRow, setNewRow] = useState<Row>({
    company_id: "", sector: "", department: "", section: "", subsection: "",
    position_title: "", manager_position: "", job_code: "",
  });

  if (auth.loading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (auth.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md"><h2 className="font-bold mb-2">الصفحة دي للأدمن فقط</h2><Link to="/"><Button>الرئيسية</Button></Link></Card>
      </div>
    );
  }

  const filtered = companyId ? positions.filter(p => p.company_id === companyId) : positions;

  const addPosition = async () => {
    if (!newRow.company_id || !newRow.sector || !newRow.position_title) {
      toast.error("الشركة + القطاع + اسم الوظيفة إجباري");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<{ error: unknown }> } })
      .from("positions").insert({
        company_id: newRow.company_id,
        sector: newRow.sector || null,
        department: newRow.department || null,
        section: newRow.section || null,
        subsection: newRow.subsection || null,
        position_title: newRow.position_title,
        manager_position: newRow.manager_position || null,
        job_code: newRow.job_code || null,
      });
    setBusy(false);
    if (error) { toast.error("فشل الإضافة"); return; }
    toast.success("تمت إضافة الوظيفة");
    setNewRow({ ...newRow, position_title: "", manager_position: "", job_code: "" });
    reload();
  };

  const deletePosition = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("positions").delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف");
    reload();
  };

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!companyId) { toast.error("اختر الشركة الأول"); if (fileRef.current) fileRef.current.value = ""; return; }
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const norm = (k: string) => k.toString().trim().toLowerCase().replace(/[\s_-]+/g, "");
      const pick = (r: Record<string, unknown>, ...keys: string[]) => {
        for (const want of keys) {
          for (const k of Object.keys(r)) {
            if (norm(k) === norm(want)) {
              const v = r[k];
              return v == null ? "" : String(v).trim();
            }
          }
        }
        return "";
      };

      const rowsForDb = rows
        .map(r => ({
          company_id: companyId,
          sector: pick(r, "sector", "قطاع", "Sector"),
          department: pick(r, "department", "إدارة", "ادارة"),
          section: pick(r, "section", "قسم"),
          subsection: pick(r, "subsection", "sub-section", "subSection", "قسم فرعي"),
          position_title: pick(r, "position", "position_title", "positiontitle", "job_title", "jobtitle", "الوظيفة", "اسم الوظيفة"),
          manager_position: pick(r, "manager", "manager_position", "managerposition", "reports to", "reportsto", "المدير"),
          job_code: pick(r, "job_code", "jobcode", "code", "كود"),
        }))
        .filter(r => r.position_title);

      if (rowsForDb.length === 0) { toast.error("الملف فاضي أو الأعمدة مش معروفة"); return; }

      // Replace strategy: delete existing for this company, then insert all
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
          insert: (r: unknown) => Promise<{ error: unknown }>;
        };
      };
      const del = await sb.from("positions").delete().eq("company_id", companyId);
      if (del.error) { toast.error("فشل حذف الموجود"); return; }

      // chunk inserts
      for (let i = 0; i < rowsForDb.length; i += 500) {
        const slice = rowsForDb.slice(i, i + 500).map(r => ({
          ...r,
          sector: r.sector || null,
          department: r.department || null,
          section: r.section || null,
          subsection: r.subsection || null,
          manager_position: r.manager_position || null,
          job_code: r.job_code || null,
        }));
        const ins = await sb.from("positions").insert(slice);
        if (ins.error) {
          console.error(ins.error);
          const em = (ins.error as { message?: string })?.message || "Unknown DB error";
          toast.error(`فشل الإدخال عند الصف ${i}: ${em}`);
          return;
        }
      }
      toast.success(`تم تحديث ${rowsForDb.length} وظيفة`);
      reload();
    } catch (err) {
      console.error(err);
      toast.error("فشل قراءة الملف");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4">
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <h1 className="text-3xl font-bold mb-2">إدارة الهيكل التنظيمي</h1>
        <p className="text-muted-foreground mb-6">رفع شيت Excel لتحديث الهيكل تلقائياً أو إضافة/حذف وظائف يدوياً.</p>

        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <Label>اختر الشركة</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="كل الشركات" /></SelectTrigger>
                <SelectContent>
                  {childCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
            <Button onClick={() => fileRef.current?.click()} disabled={busy || !companyId} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              رفع شيت Excel (يستبدل الموجود)
            </Button>
            <Button variant="outline" onClick={() => reload()} className="gap-2"><RefreshCw className="w-4 h-4" /> تحديث</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            الأعمدة المتوقعة: Sector, Department, Section, Subsection, Position (الإجباري), Manager, Job Code. يدعم العربية والإنجليزية.
          </p>
        </Card>

        <Card className="p-5 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> إضافة وظيفة يدوياً</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>الشركة *</Label>
              <Select value={newRow.company_id} onValueChange={(v) => setNewRow({ ...newRow, company_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{childCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sector *</Label><Input value={newRow.sector} onChange={(e) => setNewRow({ ...newRow, sector: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={newRow.department} onChange={(e) => setNewRow({ ...newRow, department: e.target.value })} /></div>
            <div><Label>Section</Label><Input value={newRow.section} onChange={(e) => setNewRow({ ...newRow, section: e.target.value })} /></div>
            <div><Label>Subsection</Label><Input value={newRow.subsection} onChange={(e) => setNewRow({ ...newRow, subsection: e.target.value })} /></div>
            <div><Label>Manager (Reports To)</Label><Input value={newRow.manager_position} onChange={(e) => setNewRow({ ...newRow, manager_position: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Position Title *</Label><Input value={newRow.position_title} onChange={(e) => setNewRow({ ...newRow, position_title: e.target.value })} /></div>
            <div><Label>Job Code</Label><Input value={newRow.job_code} onChange={(e) => setNewRow({ ...newRow, job_code: e.target.value })} /></div>
          </div>
          <div className="mt-3"><Button onClick={addPosition} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Plus className="w-4 h-4 ml-1.5" />} إضافة</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b font-semibold">الوظائف ({filtered.length})</div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-right p-2">Sector</th>
                  <th className="text-right p-2">Department</th>
                  <th className="text-right p-2">Section</th>
                  <th className="text-right p-2">Subsection</th>
                  <th className="text-right p-2">Position</th>
                  <th className="text-right p-2">Manager</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: Position) => (
                  <tr key={p.id} className="border-t hover:bg-accent/30">
                    <td className="p-2">{p.sector || "-"}</td>
                    <td className="p-2">{p.department || "-"}</td>
                    <td className="p-2">{p.section || "-"}</td>
                    <td className="p-2">{p.subsection || "-"}</td>
                    <td className="p-2 font-medium">{p.position_title}</td>
                    <td className="p-2 text-muted-foreground">{p.manager_position || "-"}</td>
                    <td className="p-2 text-left">
                      <Button size="sm" variant="ghost" onClick={() => deletePosition(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

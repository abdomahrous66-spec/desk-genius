import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  component: () => (<RequireAuth requireRole="super_admin"><AdminStructurePage /></RequireAuth>),
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
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyLogoUrl, setNewCompanyLogoUrl] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [uploadingLogoFor, setUploadingLogoFor] = useState<string | null>(null);

  // Auto-select first company when list loads
  useEffect(() => {
    if (!companyId && childCompanies.length > 0) setCompanyId(childCompanies[0].id);
  }, [childCompanies, companyId]);

  // Add-row form
  const [newRow, setNewRow] = useState<Row>({
    company_id: "", sector: "", department: "", section: "", subsection: "",
    position_title: "", manager_position: "", job_code: "",
  });

  const filtered = companyId ? positions.filter(p => p.company_id === companyId) : positions;
  const rootCompany = companies.find(c => !c.parent_id);

  if (auth.loading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!auth.canManageStructure) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md"><h2 className="font-bold mb-2">الصفحة دي للأدمن فقط</h2><Link to="/"><Button>الرئيسية</Button></Link></Card>
      </div>
    );
  }

  const errMsg = (e: unknown) => {
    const x = e as { message?: string; hint?: string; code?: string; details?: string } | null;
    if (!x) return "خطأ غير معروف";
    return [x.message, x.details, x.hint, x.code].filter(Boolean).join(" — ") || "خطأ غير معروف";
  };

  const createCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setCreatingCompany(true);
    const sb = supabase as unknown as {
      from: (t: string) => { insert: (r: unknown) => { select: () => Promise<{ data: { id: string }[] | null; error: unknown }> } };
    };
    const { data, error } = await sb.from("companies").insert({
      name, parent_id: rootCompany?.id ?? null, sort_order: companies.length,
      logo_url: newCompanyLogoUrl.trim() || null,
    }).select();
    setCreatingCompany(false);
    if (error) { toast.error(`فشل إضافة الشركة: ${errMsg(error)}`); return; }
    toast.success("تمت إضافة الشركة");
    setNewCompanyName("");
    setNewCompanyLogoUrl("");
    const newId = data?.[0]?.id;
    if (newId) setCompanyId(newId);
    reload();
  };

  const uploadCompanyLogo = async (companyId: string, file: File) => {
    setUploadingLogoFor(companyId);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `company-logos/${companyId}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("company-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await (supabase as unknown as { from: (t: string) => { update: (r: unknown) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from("companies").update({ logo_url: url }).eq("id", companyId);
      if (error) throw error;
      toast.success("تم تحديث الشعار");
      reload();
    } catch (e) {
      toast.error(`فشل رفع الشعار: ${errMsg(e)}`);
    } finally {
      setUploadingLogoFor(null);
    }
  };

  const deleteCompany = async (id: string) => {
    const hasPositions = positions.some(p => p.company_id === id);
    if (hasPositions) {
      if (!confirm("الشركة فيها وظائف — هيتم حذفها كلها. متأكد؟")) return;
      const delPos = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from("positions").delete().eq("company_id", id);
      if (delPos.error) { toast.error(`فشل حذف الوظائف: ${errMsg(delPos.error)}`); return; }
    } else if (!confirm("حذف الشركة نهائياً؟")) return;
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("companies").delete().eq("id", id);
    if (error) { toast.error(`فشل الحذف: ${errMsg(error)}`); return; }
    toast.success("تم الحذف");
    if (companyId === id) setCompanyId("");
    reload();
  };

  const addPosition = async () => {
    if (!newRow.company_id || !newRow.position_title) {
      toast.error("الشركة + اسم الوظيفة إجباري");
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
    if (error) { toast.error(`فشل الإضافة: ${errMsg(error)}`); return; }
    toast.success("تمت إضافة الوظيفة");
    setNewRow({ ...newRow, position_title: "", manager_position: "", job_code: "" });
    reload();
  };

  const deletePosition = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("positions").delete().eq("id", id);
    if (error) { toast.error(`فشل الحذف: ${errMsg(error)}`); return; }
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

      const norm = (k: unknown) => String(k ?? "").trim().toLowerCase().replace(/[\s_\-()،,./]+/g, "");
      const HEADER_ALIASES: Record<string, string[]> = {
        sector: ["sector", "قطاع", "القطاع"],
        department: ["department", "dept", "إدارة", "ادارة", "الإدارة", "الادارة", "قسمرئيسي"],
        section: ["section", "قسم", "القسم"],
        subsection: ["subsection", "قسمفرعي", "القسمفرعي", "القسمالفرعي"],
        position_title: ["position", "positiontitle", "jobtitle", "jobposition", "job", "الوظيفة", "اسمالوظيفة", "المسمىالوظيفي", "المسميالوظيفي", "المسمى", "وظيفة"],
        manager_position: ["manager", "managerposition", "reportsto", "reportto", "reportingto", "line manager", "linemanager", "المدير", "المديرالمباشر", "الرئيسالمباشر", "يتبع", "تبعية", "رئيسمباشر"],
        job_code: ["jobcode", "code", "كود", "الكود", "رمز"],
      };
      const matchHeader = (cell: unknown): string | null => {
        const n = norm(cell);
        if (!n) return null;
        for (const [dbCol, aliases] of Object.entries(HEADER_ALIASES)) {
          if (aliases.some(a => norm(a) === n || n.includes(norm(a)))) return dbCol;
        }
        return null;
      };

      const collected: Array<Record<string, string>> = [];
      const sheetsScanned: string[] = [];
      const sheetsSkipped: Array<{ name: string; reason: string }> = [];

      for (const sheetName of wb.SheetNames) {
        sheetsScanned.push(sheetName);
        const sheet = wb.Sheets[sheetName];
        // Read as 2D array with blank rows preserved
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][];
        if (!aoa.length) { sheetsSkipped.push({ name: sheetName, reason: "فاضي" }); continue; }

        // Find header row: the row containing the largest number of recognized headers (min 2, must contain position_title)
        let bestRowIdx = -1, bestScore = 0, bestMap: Record<number, string> = {};
        for (let i = 0; i < Math.min(aoa.length, 15); i++) {
          const row = aoa[i] ?? [];
          const map: Record<number, string> = {};
          for (let c = 0; c < row.length; c++) {
            const key = matchHeader(row[c]);
            if (key && !Object.values(map).includes(key)) map[c] = key;
          }
          const score = Object.keys(map).length;
          const hasPos = Object.values(map).includes("position_title");
          if (hasPos && score > bestScore) { bestScore = score; bestRowIdx = i; bestMap = map; }
        }
        if (bestRowIdx < 0) {
          sheetsSkipped.push({ name: sheetName, reason: "مافيش عمود اسم وظيفة" });
          continue;
        }

        for (let i = bestRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i] ?? [];
          const obj: Record<string, string> = {};
          for (const [colIdxStr, dbCol] of Object.entries(bestMap)) {
            const v = row[Number(colIdxStr)];
            obj[dbCol] = v == null ? "" : String(v).trim();
          }
          if (obj.position_title) collected.push(obj);
        }
      }

      if (collected.length === 0) {
        const summary = sheetsSkipped.map(s => `«${s.name}» (${s.reason})`).join("، ");
        toast.error(`مالقيتش وظائف. الشيتات: ${summary || sheetsScanned.join("، ")}`);
        return;
      }

      const rowsForDb = collected.map(r => ({
        company_id: companyId,
        sector: r.sector || null,
        department: r.department || null,
        section: r.section || null,
        subsection: r.subsection || null,
        position_title: r.position_title,
        manager_position: r.manager_position || null,
        job_code: r.job_code || null,
      }));

      // Replace strategy: delete existing for this company, then insert all
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> };
          insert: (r: unknown) => Promise<{ error: unknown }>;
        };
      };
      if (importMode === "replace") {
        const del = await sb.from("positions").delete().eq("company_id", companyId);
        if (del.error) { toast.error(`فشل حذف الموجود: ${errMsg(del.error)}`); return; }
      }

      for (let i = 0; i < rowsForDb.length; i += 500) {
        const ins = await sb.from("positions").insert(rowsForDb.slice(i, i + 500));
        if (ins.error) {
          toast.error(`فشل الإدخال عند الصف ${i}: ${errMsg(ins.error)}`);
          return;
        }
      }
      toast.success(`تم ${importMode === "replace" ? "استبدال" : "إضافة"} ${rowsForDb.length} وظيفة من ${sheetsScanned.length - sheetsSkipped.length} شيت`);
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
        <p className="text-muted-foreground mb-6">إنشاء شركات، رفع شيت Excel لتحديث الهيكل تلقائياً، أو إضافة/حذف وظائف يدوياً.</p>

        <Card className="p-5 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> الشركات</h2>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[220px]">
              <Label>اسم شركة جديدة</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="مثال: شركة X" />
            </div>
            <Button onClick={createCompany} disabled={creatingCompany || !newCompanyName.trim()} className="gap-2">
              {creatingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إضافة شركة
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {childCompanies.map(c => (
              <div key={c.id} className="inline-flex items-center gap-1 bg-accent/40 rounded-full px-3 py-1 text-sm">
                <span>{c.name}</span>
                <button onClick={() => deleteCompany(c.id)} className="text-destructive hover:text-destructive/80" title="حذف الشركة">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {childCompanies.length === 0 && <span className="text-xs text-muted-foreground">مافيش شركات لسه.</span>}
          </div>
        </Card>

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
            <div className="space-y-1.5 min-w-[160px]">
              <Label>وضع الاستيراد</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as "replace" | "append")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">إضافة على الموجود</SelectItem>
                  <SelectItem value="replace">استبدال الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
            <Button onClick={() => fileRef.current?.click()} disabled={busy || !companyId} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              رفع شيت Excel
            </Button>
            <Button variant="outline" onClick={() => reload()} className="gap-2"><RefreshCw className="w-4 h-4" /> تحديث</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            الأعمدة المتوقعة: Sector, Department, Section, Position (الإجباري), Manager, Job Code. يدعم العربية والإنجليزية. (Subsection اختياري لو موجود في الشيت هيتحفظ.)
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
            <div><Label>Sector</Label><Input value={newRow.sector} onChange={(e) => setNewRow({ ...newRow, sector: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={newRow.department} onChange={(e) => setNewRow({ ...newRow, department: e.target.value })} /></div>
            <div><Label>Section</Label><Input value={newRow.section} onChange={(e) => setNewRow({ ...newRow, section: e.target.value })} /></div>
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

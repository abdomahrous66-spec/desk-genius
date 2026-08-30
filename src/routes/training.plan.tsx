import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { useStructure } from "@/hooks/use-structure";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Check, Download, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TP_COLUMNS, TP_EDIT_FIELDS, NUMBER_KEYS, STATUS_LABELS, mapPlanSheetRow, type TrainingNeed } from "@/lib/training";

export const Route = createFileRoute("/training/plan")({
  head: () => ({
    meta: [
      { title: "خطة التدريب (TP) · نهضة مصر" },
      { name: "description", content: "اعتماد الاحتياجات التدريبية وإدارة خطة التدريب السنوية وتصدير التقارير." },
      { property: "og:title", content: "خطة التدريب (TP) · نهضة مصر" },
      { property: "og:description", content: "اعتماد الاحتياجات التدريبية وإدارة خطة التدريب السنوية وتصدير التقارير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<RequireAuth requireRole="super_admin"><PlanPage /></RequireAuth>),
});

function PlanPage() {
  const auth = useAuth();
  const { companies } = useStructure();
  const [rows, setRows] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "plan">("new");
  const [editing, setEditing] = useState<TrainingNeed | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCompany, setUploadCompany] = useState("");

  const companyName = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("training_needs").select("*").order("created_at", { ascending: false });
    setRows((data as unknown as TrainingNeed[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pending = rows.filter(r => r.status === "new");
  const planned = rows.filter(r => r.status === "approved" || r.status === "completed");
  const list = tab === "new" ? pending : planned;

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("training_needs").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "تم الاعتماد وترحيله لخطة التدريب" : "تم الرفض");
    load();
  };

  const approveAll = async () => {
    if (!pending.length) return;
    const ids = pending.map(r => r.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await supabase.from("training_needs").update({ status: "approved" }).in("id", ids.slice(i, i + 500));
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`تم اعتماد ${pending.length} احتياج`);
    load();
  };

  const deleteOne = async (id: string) => {
    if (!confirm("متأكد إنك عايز تحذف التدريب ده؟")) return;
    const { error } = await supabase.from("training_needs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حذف السجل");
    load();
  };

  const deleteAll = async () => {
    const target = tab === "new" ? pending : planned;
    if (!target.length) { toast.error("لا توجد سجلات للحذف"); return; }
    if (!confirm(`متأكد إنك عايز تحذف كل السجلات (${target.length})؟ لا يمكن التراجع.`)) return;
    if (!confirm("تأكيد أخير: سيتم حذف كل السجلات نهائياً.")) return;
    const ids = target.map(r => r.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await supabase.from("training_needs").delete().in("id", ids.slice(i, i + 500));
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`تم حذف ${target.length} سجل`);
    load();
  };

  const openEdit = (r: TrainingNeed) => {
    setEditing(r);
    setDraft(Object.fromEntries(TP_EDIT_FIELDS.map(f => [f.key as string, (r[f.key] ?? "") as string])));
  };

  const openCreate = () => {
    setCreating(true);
    setDraft(Object.fromEntries([...TP_EDIT_FIELDS.map(f => [f.key as string, ""]), ["training_topic", ""], ["sector", ""], ["department", ""], ["position_title", ""], ["employee_code", ""], ["employee_name", ""]]));
  };

  const saveEdit = async () => {
    if (!editing && !creating) return;
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      payload[k] = v === "" ? null : NUMBER_KEYS.has(k) ? Number(v) : v;
    }
    if (creating) {
      if (!draft.training_topic?.trim()) { toast.error("الموضوع التدريبي مطلوب"); return; }
      setSaving(true);
      const { error: cErr } = await supabase.from("training_needs").insert({
        ...payload, training_topic: draft.training_topic.trim(),
        created_by: auth.user!.id, company_id: uploadCompany || null, status: "approved",
      } as never);
      setSaving(false);
      if (cErr) { toast.error(cErr.message); return; }
      toast.success("تمت إضافة السجل لخطة التدريب");
      setCreating(false);
      load();
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("training_needs").update(payload as never).eq("id", editing!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ بيانات خطة التدريب");
    setEditing(null);
    load();
  };

  const downloadPlanTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TP_COLUMNS.map(c => c.header)]);
    ws["!cols"] = TP_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Training Plan");
    XLSX.writeFile(wb, "Training-Plan-Template.xlsx");
  };

  const onUploadPlan = async (file: File) => {
    setUploading(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const byName = new Map(companies.map(c => [c.name.trim().toLowerCase(), c.id]));
      const mapped = json
        .map(r => {
          const row = mapPlanSheetRow(r) as Record<string, unknown>;
          const cName = Object.entries(r).find(([k]) => /company|الشركة/i.test(k))?.[1];
          const cid = uploadCompany || (cName ? byName.get(String(cName).trim().toLowerCase()) : undefined);
          return { ...row, company_id: cid ?? null, created_by: auth.user!.id, status: "approved" };
        })
        .filter(r => r.training_topic && String(r.training_topic).trim());
      if (!mapped.length) { toast.error("مفيش صفوف صالحة — تأكد من عمود Training Topics"); return; }
      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < mapped.length; i += CHUNK) {
        const { error } = await supabase.from("training_needs").insert(mapped.slice(i, i + CHUNK) as never);
        if (error) { toast.error(`فشل الرفع عند السجل ${inserted + 1}: ` + error.message); return; }
        inserted += Math.min(CHUNK, mapped.length - i);
      }
      toast.success(`تم رفع ${inserted} سجل لخطة التدريب`);
      setTab("plan");
      load();
    } catch {
      toast.error("ملف غير صالح");
    } finally {
      setUploading(false);
    }
  };

  const exportReport = () => {
    const data = planned.length ? planned : rows;
    const aoa = [
      TP_COLUMNS.map(c => c.header),
      ...data.map(r => TP_COLUMNS.map(c => {
        const v = c.key === "company_id" ? companyName[r.company_id ?? ""] ?? "" : r[c.key];
        return v ?? "";
      })),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = TP_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Training Plan");
    XLSX.writeFile(wb, "Training-Plan.xlsx");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-bold">خطة التدريب (TP) · فريق الـ OD</div>
          <Link to="/"><Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15"><ArrowRight className="w-4 h-4 ml-1" /> الرئيسية</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <Button variant={tab === "new" ? "default" : "outline"} onClick={() => setTab("new")}>طلبات بانتظار الاعتماد ({pending.length})</Button>
            <Button variant={tab === "plan" ? "default" : "outline"} onClick={() => setTab("plan")}>خطة التدريب ({planned.length})</Button>
          </div>
          <div className="flex gap-2">
            {tab === "new" && <Button variant="secondary" onClick={approveAll} disabled={!pending.length}><Check className="w-4 h-4 ml-1" /> اعتماد الكل</Button>}
            <Button variant="destructive" onClick={deleteAll} disabled={loading || !list.length}><Trash2 className="w-4 h-4 ml-1" /> حذف الكل</Button>
            <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 ml-1" /> تصدير تقرير Excel</Button>
            <Button variant="outline" onClick={downloadPlanTemplate}><Download className="w-4 h-4 ml-1" /> تمبلت الخطة</Button>
            <label>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUploadPlan(f); e.currentTarget.value = ""; }} />
              <Button variant="outline" asChild disabled={uploading}>
                <span>{uploading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Upload className="w-4 h-4 ml-1" />} رفع شيت التدريب</span>
              </Button>
            </label>
            <Button onClick={openCreate}><Plus className="w-4 h-4 ml-1" /> إضافة سجل</Button>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={uploadCompany} onChange={e => setUploadCompany(e.target.value)}>
              <option value="">الشركة (اختياري)</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <Card className="p-4">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : list.length === 0 ? (
            <p className="text-muted-foreground p-4">لا توجد بيانات.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["الموظف", "القطاع", "الإدارة", "المسمى", "الموضوع التدريبي", "المزود", "التكلفة", "الحالة", "إجراءات"].map(h => (
                      <th key={h} className="p-2 text-right font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="p-2 whitespace-nowrap">{r.employee_name || r.employee_code || "—"}</td>
                      <td className="p-2 whitespace-nowrap">{r.sector || "—"}</td>
                      <td className="p-2 whitespace-nowrap">{r.department || "—"}</td>
                      <td className="p-2 whitespace-nowrap">{r.position_title || "—"}</td>
                      <td className="p-2">{r.training_topic}</td>
                      <td className="p-2 whitespace-nowrap">{r.training_provider || "—"}</td>
                      <td className="p-2 whitespace-nowrap">{r.total_training_cost ?? "—"}</td>
                      <td className="p-2 whitespace-nowrap">{STATUS_LABELS[r.status] ?? r.status}</td>
                      <td className="p-2 whitespace-nowrap">
                        {r.status === "new" ? (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => setStatus(r.id, "approved")}><Check className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}><X className="w-4 h-4" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteOne(r.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteOne(r.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!editing || creating} onOpenChange={o => { if (!o) { setEditing(null); setCreating(false); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto" dir="rtl">
          <DialogHeader><DialogTitle>{creating ? "إضافة سجل تدريب" : `بيانات خطة التدريب — ${editing?.training_topic}`}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-3 gap-4">
            {creating && ([
              ["training_topic", "Training Topic *"], ["sector", "Sector"], ["department", "Department"],
              ["position_title", "Position"], ["employee_code", "Employee Code"], ["employee_name", "Employee Name"],
            ] as const).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={draft[k] ?? ""} onChange={e => setDraft(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            {TP_EDIT_FIELDS.map(f => (
              <div key={f.key as string} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input type={f.type} value={draft[f.key as string] ?? ""}
                  onChange={e => setDraft(p => ({ ...p, [f.key as string]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />} حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { useStructure, NA_KEY } from "@/hooks/use-structure";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Download, Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  TN_COLUMNS, PRIORITIES, QUARTERS, TRAINING_TYPES, STATUS_LABELS,
  mapSheetRow, type TrainingNeed,
} from "@/lib/training";

export const Route = createFileRoute("/training/needs")({
  head: () => ({
    meta: [
      { title: "الاحتياجات التدريبية (TN) · نهضة مصر" },
      { name: "description", content: "تسجيل الاحتياجات التدريبية للموظفين ورفعها لفريق التطوير التنظيمي." },
      { property: "og:title", content: "الاحتياجات التدريبية (TN) · نهضة مصر" },
      { property: "og:description", content: "تسجيل الاحتياجات التدريبية للموظفين ورفعها لفريق التطوير التنظيمي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<RequireAuth requireRole="training"><NeedsPage /></RequireAuth>),
});

type Draft = Partial<TrainingNeed> & { training_topic?: string };

const EMPTY: Draft = {
  company_id: "", sector: "", department: "", section: "", position_title: "",
  employee_code: "", employee_name: "", training_topic: "", expected_kpi: "",
  training_type: "", training_objective: "", training_priority: "",
  recommended_quarter_1: "", recommended_quarter_2: "", provider_recommendation: "", notes: "",
};

function NeedsPage() {
  const auth = useAuth();
  const { companies, positions, loading: structLoading } = useStructure();
  const [rows, setRows] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Draft>(EMPTY);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("training_needs").select("*").order("created_at", { ascending: false });
    setRows((data as unknown as TrainingNeed[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sectors = useMemo(
    () => Array.from(new Set(positions.filter(p => !d.company_id || p.company_id === d.company_id).map(p => p.sector || NA_KEY))).sort(),
    [positions, d.company_id],
  );
  const departments = useMemo(
    () => Array.from(new Set(positions.filter(p => (!d.company_id || p.company_id === d.company_id) && (p.sector || NA_KEY) === d.sector).map(p => p.department || NA_KEY))).sort(),
    [positions, d.company_id, d.sector],
  );
  const positionOptions = useMemo(
    () => Array.from(new Set(positions.filter(p => (!d.company_id || p.company_id === d.company_id) && (p.sector || NA_KEY) === d.sector && (p.department || NA_KEY) === d.department).map(p => p.position_title))).sort(),
    [positions, d.company_id, d.sector, d.department],
  );

  const set = (k: keyof Draft, v: string) => setD(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!d.training_topic?.trim()) { toast.error("الموضوع التدريبي مطلوب"); return; }
    setSaving(true);
    const payload = {
      created_by: auth.user!.id,
      company_id: d.company_id || null,
      sector: d.sector && d.sector !== NA_KEY ? d.sector : null,
      department: d.department && d.department !== NA_KEY ? d.department : null,
      position_title: d.position_title || null,
      employee_code: d.employee_code || null,
      employee_name: d.employee_name || null,
      training_topic: d.training_topic!.trim(),
      expected_kpi: d.expected_kpi || null,
      training_type: d.training_type || null,
      training_objective: d.training_objective || null,
      training_priority: d.training_priority || null,
      recommended_quarter_1: d.recommended_quarter_1 || null,
      recommended_quarter_2: d.recommended_quarter_2 || null,
      provider_recommendation: d.provider_recommendation || null,
      notes: d.notes || null,
    };
    const { error } = await supabase.from("training_needs").insert(payload);
    setSaving(false);
    if (error) { toast.error("فشل الحفظ: " + error.message); return; }
    toast.success("تم تسجيل الاحتياج التدريبي");
    setD({ ...EMPTY, company_id: d.company_id, sector: d.sector, department: d.department });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("training_needs").delete().eq("id", id);
    if (error) { toast.error("لا يمكن الحذف بعد الاعتماد"); return; }
    toast.success("تم الحذف");
    load();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TN_COLUMNS.map(c => c.header)]);
    ws["!cols"] = TN_COLUMNS.map(() => ({ wch: 28 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TN");
    XLSX.writeFile(wb, "Training-Needs-Template.xlsx");
  };

  const onUpload = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const mapped = json.map(mapSheetRow).filter(r => r.training_topic && String(r.training_topic).trim());
      if (!mapped.length) { toast.error("مفيش صفوف صالحة — تأكد من عمود الموضوع التدريبي"); return; }
      const payload = mapped.map(r => ({
        ...r,
        training_topic: String(r.training_topic),
        created_by: auth.user!.id,
        company_id: d.company_id || null,
      }));
      const { error } = await supabase.from("training_needs").insert(payload as never);
      if (error) { toast.error("فشل الرفع: " + error.message); return; }
      toast.success(`تم رفع ${payload.length} احتياج تدريبي`);
      load();
    } catch (e) {
      toast.error("ملف غير صالح");
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-bold">الاحتياجات التدريبية (TN)</div>
          <Link to="/"><Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15"><ArrowRight className="w-4 h-4 ml-1" /> الرئيسية</Button></Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold">تسجيل احتياج تدريبي</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4 ml-1" /> تنزيل التمبلت</Button>
              <label>
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ""; }} />
                <Button variant="outline" size="sm" asChild><span><Upload className="w-4 h-4 ml-1" /> رفع شيت</span></Button>
              </label>
            </div>
          </div>

          {structLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="الشركة">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={d.company_id ?? ""} onChange={e => setD(p => ({ ...p, company_id: e.target.value, sector: "", department: "", position_title: "" }))}>
                  <option value="">— اختر —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="القطاع (Sector)">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={d.sector ?? ""} onChange={e => setD(p => ({ ...p, sector: e.target.value, department: "", position_title: "" }))}>
                  <option value="">— اختر —</option>
                  {sectors.map(s => <option key={s} value={s}>{s === NA_KEY ? "(عام)" : s}</option>)}
                </select>
              </Field>
              <Field label="الإدارة (Department)">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={d.department ?? ""} onChange={e => setD(p => ({ ...p, department: e.target.value, position_title: "" }))}>
                  <option value="">— اختر —</option>
                  {departments.map(s => <option key={s} value={s}>{s === NA_KEY ? "(عام)" : s}</option>)}
                </select>
              </Field>
              <Field label="المسمى الوظيفي (Position)">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={d.position_title ?? ""} onChange={e => set("position_title", e.target.value)}>
                  <option value="">— اختر —</option>
                  {positionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="كود الموظف"><Input value={d.employee_code ?? ""} onChange={e => set("employee_code", e.target.value)} /></Field>
              <Field label="اسم الموظف"><Input value={d.employee_name ?? ""} onChange={e => set("employee_name", e.target.value)} /></Field>
              <Field label="الموضوع التدريبي المطلوب *"><Input value={d.training_topic ?? ""} onChange={e => set("training_topic", e.target.value)} /></Field>
              <Field label="مؤشر الأداء بعد التدريب"><Input value={d.expected_kpi ?? ""} onChange={e => set("expected_kpi", e.target.value)} /></Field>
              <Field label="نوع التدريب">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={d.training_type ?? ""} onChange={e => set("training_type", e.target.value)}>
                  <option value="">— اختر —</option>{TRAINING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="أولوية التنفيذ">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={d.training_priority ?? ""} onChange={e => set("training_priority", e.target.value)}>
                  <option value="">— اختر —</option>{PRIORITIES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="التوقيت المقترح 1">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={d.recommended_quarter_1 ?? ""} onChange={e => set("recommended_quarter_1", e.target.value)}>
                  <option value="">— اختر —</option>{QUARTERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="التوقيت المقترح 2">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={d.recommended_quarter_2 ?? ""} onChange={e => set("recommended_quarter_2", e.target.value)}>
                  <option value="">— اختر —</option>{QUARTERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="هدف التدريب" full><Textarea rows={2} value={d.training_objective ?? ""} onChange={e => set("training_objective", e.target.value)} /></Field>
              <Field label="شركات تدريب مقترحة"><Input value={d.provider_recommendation ?? ""} onChange={e => set("provider_recommendation", e.target.value)} /></Field>
              <Field label="ملاحظات" full><Textarea rows={2} value={d.notes ?? ""} onChange={e => set("notes", e.target.value)} /></Field>
            </div>
          )}

          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />} حفظ الاحتياج
          </Button>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">الاحتياجات المسجلة ({rows.length})</h2>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : rows.length === 0 ? (
            <p className="text-muted-foreground">لا توجد احتياجات مسجلة بعد.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["الموظف", "المسمى", "الإدارة", "الموضوع التدريبي", "الأولوية", "الحالة", ""].map(h => (
                      <th key={h} className="p-2 text-right font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="p-2">{r.employee_name || r.employee_code || "—"}</td>
                      <td className="p-2">{r.position_title || "—"}</td>
                      <td className="p-2">{r.department || "—"}</td>
                      <td className="p-2">{r.training_topic}</td>
                      <td className="p-2">{r.training_priority || "—"}</td>
                      <td className="p-2">{STATUS_LABELS[r.status] ?? r.status}</td>
                      <td className="p-2">
                        {r.status === "new" && (
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-3 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

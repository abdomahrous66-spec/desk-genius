import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppraisalShell, CyclePicker, useCycles, useIsOD } from "@/components/AppraisalShell";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { DEFAULT_BANDS, PENALTY_HEADERS, downloadXlsx, readXlsx, type Band, type Cycle, type Penalty } from "@/lib/appraisal";

export const Route = createFileRoute("/appraisal/settings")({
  head: () => ({
    meta: [
      { title: "Appraisal Settings · Nahdet Misr" },
      { name: "description", content: "OD settings for the performance appraisal: cycles, weights, rating bands, bell curve and penalties." },
      { property: "og:title", content: "Appraisal Settings · Nahdet Misr" },
      { property: "og:description", content: "Configure appraisal cycles, rating bands, bell curve and penalties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth requireCap="viewTP"><Settings /></RequireAuth>,
});

type Draft = Omit<Cycle, "id" | "status"> & { id?: string; status: string };
const emptyDraft = (): Draft => ({ name: `Appraisal ${new Date().getFullYear()}`, year: new Date().getFullYear(), company_id: null, objectives_weight: 70, competencies_weight: 30, penalties_weight: 5, rating_bands: DEFAULT_BANDS, status: "open" });

function Settings() {
  const isOD = useIsOD();
  const auth = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (en: string, a: string) => (ar ? a : en);
  const { cycles, cycleId, setCycleId, cycle, companies, reload } = useCycles();
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [pens, setPens] = useState<Penalty[]>([]);
  const [newPen, setNewPen] = useState({ code: "", employee_name: "", penalties_count: 1, notes: "" });

  useEffect(() => { setDraft(cycle ? { ...cycle } : emptyDraft()); }, [cycle]);
  const loadPens = async () => {
    if (!cycleId) return setPens([]);
    const { data } = await supabase.from("appraisal_penalties").select("*").eq("cycle_id", cycleId).order("code");
    setPens((data ?? []) as Penalty[]);
  };
  useEffect(() => { loadPens(); }, [cycleId]);

  if (!isOD) return <AppraisalShell title={L("Appraisal Settings", "إعدادات التقييم")}><Card className="p-6">{L("This page is for the OD team only.", "هذه الصفحة لفريق OD فقط.")}</Card></AppraisalShell>;

  const curveTotal = draft.rating_bands.reduce((a, b) => a + Number(b.curve || 0), 0);
  const setBand = (i: number, k: keyof Band, v: string) =>
    setDraft(d => ({ ...d, rating_bands: d.rating_bands.map((b, j) => (j === i ? { ...b, [k]: ["min", "max", "curve"].includes(k) ? Number(v) : v } : b)) }));

  const saveCycle = async () => {
    const payload = { name: draft.name, year: Number(draft.year), company_id: draft.company_id || null, objectives_weight: Number(draft.objectives_weight), competencies_weight: Number(draft.competencies_weight), penalties_weight: Number(draft.penalties_weight), rating_bands: draft.rating_bands as never, status: draft.status };
    const res = draft.id
      ? await supabase.from("appraisal_cycles").update(payload).eq("id", draft.id).select().single()
      : await supabase.from("appraisal_cycles").insert({ ...payload, created_by: auth.user?.id }).select().single();
    if (res.error) return toast.error(res.error.message);
    toast.success(L("Saved", "تم الحفظ"));
    await reload(); setCycleId(res.data.id);
  };
  const deleteCycle = async () => {
    if (!draft.id || !confirm(L("Delete this cycle and ALL its employees, evaluations and penalties?", "حذف الدورة وكل موظفيها وتقييماتها وجزاءاتها؟"))) return;
    const { error } = await supabase.from("appraisal_cycles").delete().eq("id", draft.id);
    if (error) return toast.error(error.message);
    toast.success(L("Deleted", "تم الحذف")); reload();
  };

  const addPen = async () => {
    if (!cycleId || !newPen.code) return toast.error(L("Code is required", "الكود مطلوب"));
    const { error } = await supabase.from("appraisal_penalties").upsert({ ...newPen, cycle_id: cycleId, created_by: auth.user?.id }, { onConflict: "cycle_id,code" });
    if (error) return toast.error(error.message);
    setNewPen({ code: "", employee_name: "", penalties_count: 1, notes: "" }); loadPens();
  };
  const updatePen = async (p: Penalty, patch: Partial<Penalty>) => {
    const { error } = await supabase.from("appraisal_penalties").update(patch).eq("id", p.id);
    if (error) toast.error(error.message); else loadPens();
  };
  const delPen = async (id?: string) => {
    if (!confirm(L("Delete?", "تأكيد الحذف؟"))) return;
    const q = supabase.from("appraisal_penalties").delete();
    const { error } = id ? await q.eq("id", id) : await q.eq("cycle_id", cycleId);
    if (error) toast.error(error.message); else loadPens();
  };
  const uploadPens = async (f: File) => {
    const rows = await readXlsx(f);
    const recs = rows.map(r => ({ cycle_id: cycleId, created_by: auth.user?.id, code: String(r["Code"] ?? "").trim(), employee_name: String(r["Name"] ?? "").trim() || null, penalties_count: Number(r["Penalties"] ?? 0) || 0, notes: String(r["Notes"] ?? "").trim() || null })).filter(r => r.code);
    const { error } = await supabase.from("appraisal_penalties").upsert(recs, { onConflict: "cycle_id,code" });
    if (error) return toast.error(error.message);
    toast.success(L(`${recs.length} rows uploaded`, `تم رفع ${recs.length} صف`)); loadPens();
  };

  return (
    <AppraisalShell title={L("Appraisal Settings", "إعدادات التقييم")}>
      <Card className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2 className="text-xl font-bold">{L("Appraisal cycle", "دورة التقييم")}</h2>
          <div className="flex gap-2 items-center">
            {cycles.length > 0 && <CyclePicker cycles={cycles} value={cycleId} onChange={setCycleId} label={L("Cycle", "الدورة")} />}
            <Button variant="outline" size="sm" onClick={() => { setCycleId(""); setDraft(emptyDraft()); }}><Plus className="w-4 h-4" /> {L("New cycle", "دورة جديدة")}</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label={L("Name", "الاسم")}><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label={L("Year", "السنة")}><Input type="number" value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })} /></Field>
          <Field label={L("Company", "الشركة")}>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={draft.company_id ?? ""} onChange={e => setDraft({ ...draft, company_id: e.target.value || null })}>
              <option value="">{L("All companies", "كل الشركات")}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={L("Objectives weight %", "وزن الأهداف %")}><Input type="number" value={draft.objectives_weight} onChange={e => setDraft({ ...draft, objectives_weight: Number(e.target.value) })} /></Field>
          <Field label={L("Competencies weight %", "وزن الجدارات %")}><Input type="number" value={draft.competencies_weight} onChange={e => setDraft({ ...draft, competencies_weight: Number(e.target.value) })} /></Field>
          <Field label={L("Deduction per penalty %", "خصم كل جزاء %")}><Input type="number" value={draft.penalties_weight} onChange={e => setDraft({ ...draft, penalties_weight: Number(e.target.value) })} /></Field>
          <Field label={L("Status", "الحالة")}>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
              <option value="open">{L("Open", "مفتوحة")}</option><option value="closed">{L("Closed", "مغلقة")}</option>
            </select>
          </Field>
        </div>

        <div>
          <h3 className="font-semibold mb-2">{L("Rating bands & bell curve", "حدود التقديرات والبيل كيرف")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-muted"><tr>{[L("Rating", "التقدير"), L("Arabic", "عربي"), L("From %", "من %"), L("To %", "إلى %"), L("Bell curve %", "نسبة البيل كيرف %")].map(h => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead>
              <tbody>
                {draft.rating_bands.map((b, i) => (
                  <tr key={b.key} className="border-t">
                    <td className="p-1"><Input value={b.label} onChange={e => setBand(i, "label", e.target.value)} /></td>
                    <td className="p-1"><Input value={b.label_ar} onChange={e => setBand(i, "label_ar", e.target.value)} /></td>
                    <td className="p-1"><Input type="number" value={b.min} onChange={e => setBand(i, "min", e.target.value)} /></td>
                    <td className="p-1"><Input type="number" value={b.max} onChange={e => setBand(i, "max", e.target.value)} /></td>
                    <td className="p-1"><Input type="number" value={b.curve} onChange={e => setBand(i, "curve", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`text-sm mt-2 ${curveTotal === 100 ? "text-muted-foreground" : "text-destructive"}`}>{L("Bell curve total", "إجمالي البيل كيرف")}: {curveTotal}%</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveCycle}><Save className="w-4 h-4" /> {L("Save cycle", "حفظ الدورة")}</Button>
          {draft.id && <Button variant="destructive" onClick={deleteCycle}><Trash2 className="w-4 h-4" /> {L("Delete cycle", "حذف الدورة")}</Button>}
        </div>
      </Card>

      {cycleId && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <h2 className="text-xl font-bold">{L("Penalties (from Personnel)", "الجزاءات (من شؤون العاملين)")}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadXlsx("Penalties-Template.xlsx", PENALTY_HEADERS)}><Download className="w-4 h-4" /> {L("Template", "التمبلت")}</Button>
              <label><input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPens(f); e.target.value = ""; }} />
                <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted"><Upload className="w-4 h-4" /> {L("Upload", "رفع")}</span></label>
              <Button variant="outline" size="sm" onClick={() => downloadXlsx("Penalties.xlsx", PENALTY_HEADERS, pens.map(p => [p.code, p.employee_name, p.penalties_count, p.notes]))}><Download className="w-4 h-4" /> {L("Export", "تصدير")}</Button>
              {pens.length > 0 && <Button variant="destructive" size="sm" onClick={() => delPen()}><Trash2 className="w-4 h-4" /> {L("Delete all", "حذف الكل")}</Button>}
            </div>
          </div>
          <div className="grid md:grid-cols-5 gap-2">
            <Input placeholder={L("Code", "الكود")} value={newPen.code} onChange={e => setNewPen({ ...newPen, code: e.target.value })} />
            <Input placeholder={L("Name", "الاسم")} value={newPen.employee_name} onChange={e => setNewPen({ ...newPen, employee_name: e.target.value })} />
            <Input type="number" placeholder={L("Penalties", "الجزاءات")} value={newPen.penalties_count} onChange={e => setNewPen({ ...newPen, penalties_count: Number(e.target.value) })} />
            <Input placeholder={L("Notes", "ملاحظات")} value={newPen.notes} onChange={e => setNewPen({ ...newPen, notes: e.target.value })} />
            <Button onClick={addPen}><Plus className="w-4 h-4" /> {L("Add", "إضافة")}</Button>
          </div>
          <table className="w-full text-sm border">
            <thead className="bg-muted"><tr>{[L("Code", "الكود"), L("Name", "الاسم"), L("Penalties", "الجزاءات"), L("Notes", "ملاحظات"), ""].map((h, i) => <th key={i} className="p-2 text-start">{h}</th>)}</tr></thead>
            <tbody>
              {pens.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.code}</td>
                  <td className="p-1"><Input defaultValue={p.employee_name ?? ""} onBlur={e => e.target.value !== (p.employee_name ?? "") && updatePen(p, { employee_name: e.target.value })} /></td>
                  <td className="p-1 w-28"><Input type="number" defaultValue={p.penalties_count} onBlur={e => Number(e.target.value) !== p.penalties_count && updatePen(p, { penalties_count: Number(e.target.value) })} /></td>
                  <td className="p-1"><Input defaultValue={p.notes ?? ""} onBlur={e => e.target.value !== (p.notes ?? "") && updatePen(p, { notes: e.target.value })} /></td>
                  <td className="p-1 w-12"><Button size="icon" variant="ghost" onClick={() => delPen(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                </tr>
              ))}
              {!pens.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">{L("No penalties yet", "لا توجد جزاءات")}</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </AppraisalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1 block text-sm"><span className="font-medium">{label}</span>{children}</label>;
}

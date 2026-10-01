import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppraisalShell, CyclePicker, useCycles, useIsOD } from "@/components/AppraisalShell";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { COMP_COUNT, OBJ_COUNT, downloadXlsx, employeeHeaders, employeeToRow, readXlsx, rowToEmployee, type Emp } from "@/lib/appraisal";

export const Route = createFileRoute("/appraisal/employees")({
  head: () => ({
    meta: [
      { title: "Appraisal Employees & Objectives · Nahdet Misr" },
      { name: "description", content: "Employees, objectives, KPIs and competencies for the performance appraisal — manual entry or Excel template." },
      { property: "og:title", content: "Appraisal Employees & Objectives · Nahdet Misr" },
      { property: "og:description", content: "Manage appraisal employees, objectives and competencies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth requireCap="viewTP"><Employees /></RequireAuth>,
});

const BASE_FIELDS: [keyof Emp, string, string][] = [
  ["code", "Code", "الكود"], ["name", "Name", "الاسم"], ["hiring_date", "Hiring Date", "تاريخ التعيين"], ["employee_status", "Employee Status", "الحالة"],
  ["position_en", "English Position", "الوظيفة"], ["location", "Location", "الموقع"], ["email", "Email", "البريد"], ["phone", "Phone", "الهاتف"],
  ["sector", "Sector", "القطاع"], ["department", "Department", "الإدارة"], ["section", "Section", "القسم"], ["subsection", "Subsection", "القسم الفرعي"],
  ["managerial_level", "Managerial Level", "المستوى الإداري"], ["manager_name", "Manager Name", "اسم المدير"], ["parent_position_en", "Parent Position", "الوظيفة الأعلى"],
];

const blank = (cycleId: string, company: string | null): Emp => ({
  id: "", cycle_id: cycleId, company_id: company, code: "", name: "", hiring_date: null, employee_status: null, position_en: null, location: null,
  email: null, phone: null, sector: null, department: null, section: null, subsection: null, managerial_level: null, manager_name: null, parent_position_en: null,
  objectives: [], budget: null, competencies: [],
});

function Employees() {
  const auth = useAuth();
  const isOD = useIsOD();
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (en: string, a: string) => (ar ? a : en);
  const { cycles, cycleId, setCycleId, cycle, companies } = useCycles();
  const [rows, setRows] = useState<Emp[]>([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Emp | null>(null);
  const [busy, setBusy] = useState(false);
  const canDelete = isOD || auth.canDelete;

  const load = async () => {
    if (!cycleId) return setRows([]);
    const all: Emp[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("appraisal_employees").select("*").eq("cycle_id", cycleId).order("code").range(from, from + 999);
      if (error) { toast.error(error.message); break; }
      all.push(...((data ?? []) as unknown as Emp[]));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
  };
  useEffect(() => { load(); }, [cycleId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => [r.code, r.name, r.sector, r.department, r.section, r.manager_name, r.position_en].some(v => (v ?? "").toLowerCase().includes(s)));
  }, [rows, q]);

  const compName = (id: string | null) => companies.find(c => c.id === id)?.name ?? "";

  const upload = async (f: File) => {
    if (!cycleId) return;
    setBusy(true);
    try {
      const recs = (await readXlsx(f)).map(r => ({ ...rowToEmployee(r, companies, cycle?.company_id ?? null), cycle_id: cycleId, created_by: auth.user?.id }))
        .filter(r => r.code && r.name);
      for (let i = 0; i < recs.length; i += 500) {
        const { error } = await supabase.from("appraisal_employees").upsert(recs.slice(i, i + 500) as never, { onConflict: "cycle_id,code" });
        if (error) throw error;
      }
      toast.success(L(`${recs.length} employees uploaded`, `تم رفع ${recs.length} موظف`));
      load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const save = async (e: Emp) => {
    if (!e.code || !e.name) return toast.error(L("Code and name are required", "الكود والاسم مطلوبان"));
    const { id, ...rest } = e;
    const payload = { ...rest, objectives: e.objectives.filter(o => o.objective), competencies: e.competencies.filter(c => c.name), budget: e.budget?.name ? e.budget : null } as never;
    const res = id ? await supabase.from("appraisal_employees").update(payload).eq("id", id)
      : await supabase.from("appraisal_employees").insert({ ...(payload as object), created_by: auth.user?.id } as never);
    if (res.error) return toast.error(res.error.message);
    toast.success(L("Saved", "تم الحفظ")); setEdit(null); load();
  };

  const del = async (id?: string) => {
    if (!confirm(id ? L("Delete this employee?", "حذف هذا الموظف؟") : L("Delete ALL employees in this cycle?", "حذف كل موظفي الدورة؟"))) return;
    const q = supabase.from("appraisal_employees").delete();
    const { error } = id ? await q.eq("id", id) : await q.eq("cycle_id", cycleId);
    if (error) toast.error(error.message); else load();
  };

  return (
    <AppraisalShell title={L("Employees, Objectives & Competencies", "الموظفين والأهداف والجدارات")}>
      {!cycles.length ? (
        <Card className="p-6">{L("No appraisal cycle yet. The OD team must create one in Appraisal Settings.", "لا توجد دورة تقييم. يجب أن ينشئ فريق OD دورة من إعدادات التقييم.")}</Card>
      ) : (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <CyclePicker cycles={cycles} value={cycleId} onChange={setCycleId} label={L("Cycle", "الدورة")} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEdit(blank(cycleId, cycle?.company_id ?? null))}><Plus className="w-4 h-4" /> {L("Add employee", "إضافة موظف")}</Button>
              <Button size="sm" variant="outline" onClick={() => downloadXlsx("Appraisal-Employees-Template.xlsx", employeeHeaders())}><Download className="w-4 h-4" /> {L("Template", "التمبلت")}</Button>
              <label><input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted"><Upload className="w-4 h-4" /> {busy ? "..." : L("Upload sheet", "رفع الشيت")}</span></label>
              <Button size="sm" variant="outline" onClick={() => downloadXlsx("Appraisal-Employees.xlsx", employeeHeaders(), filtered.map(e => employeeToRow(e, compName(e.company_id))))}><Download className="w-4 h-4" /> {L("Export", "تصدير")}</Button>
              {canDelete && rows.length > 0 && <Button size="sm" variant="destructive" onClick={() => del()}><Trash2 className="w-4 h-4" /> {L("Delete all", "حذف الكل")}</Button>}
            </div>
          </div>
          <Input placeholder={L("Search by code, name, sector, department, manager...", "ابحث بالكود أو الاسم أو القطاع أو الإدارة أو المدير...")} value={q} onChange={e => setQ(e.target.value)} />
          <div className="text-sm text-muted-foreground">{filtered.length} / {rows.length}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-muted"><tr>{[L("Code", "الكود"), L("Name", "الاسم"), L("Position", "الوظيفة"), L("Sector", "القطاع"), L("Department", "الإدارة"), L("Manager", "المدير"), L("Objectives", "الأهداف"), L("Competencies", "الجدارات"), ""].map((h, i) => <th key={i} className="p-2 text-start whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.slice(0, 500).map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.code}</td><td className="p-2">{e.name}</td><td className="p-2">{e.position_en}</td>
                    <td className="p-2">{e.sector}</td><td className="p-2">{e.department}</td><td className="p-2">{e.manager_name}</td>
                    <td className="p-2">{e.objectives?.length ?? 0}</td><td className="p-2">{e.competencies?.length ?? 0}</td>
                    <td className="p-1 whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setEdit(e)}><Pencil className="w-4 h-4" /></Button>
                      {canDelete && <Button size="icon" variant="ghost" onClick={() => del(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">{L("No employees", "لا يوجد موظفين")}</td></tr>}
              </tbody>
            </table>
            {filtered.length > 500 && <p className="text-xs text-muted-foreground mt-2">{L("Showing first 500 — use search to narrow.", "يتم عرض أول 500 — استخدم البحث.")}</p>}
          </div>
        </Card>
      )}

      <Dialog open={!!edit} onOpenChange={o => !o && setEdit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? L("Edit employee", "تعديل موظف") : L("Add employee", "إضافة موظف")}</DialogTitle></DialogHeader>
          {edit && <EmpForm emp={edit} companies={companies} L={L} onSave={save} />}
        </DialogContent>
      </Dialog>
    </AppraisalShell>
  );
}

function EmpForm({ emp, companies, L, onSave }: { emp: Emp; companies: { id: string; name: string }[]; L: (e: string, a: string) => string; onSave: (e: Emp) => void }) {
  const [e, setE] = useState<Emp>(() => ({
    ...emp,
    objectives: Array.from({ length: OBJ_COUNT }, (_, i) => emp.objectives?.[i] ?? { objective: "", kpi: "", target: "", weight: 0 }),
    competencies: Array.from({ length: COMP_COUNT }, (_, i) => emp.competencies?.[i] ?? { name: "", indicators: "", weight: 0 }),
    budget: emp.budget ?? { name: "", kpi: "", target: "", weight: 0 },
  }));
  const objTotal = e.objectives.reduce((a, o) => a + Number(o.weight || 0), 0) + Number(e.budget?.weight || 0);
  const compTotal = e.competencies.reduce((a, c) => a + Number(c.weight || 0), 0);
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-3 gap-3">
        {BASE_FIELDS.map(([k, en, a]) => (
          <label key={k} className="text-sm space-y-1 block"><span>{L(en, a)}</span>
            <Input type={k === "hiring_date" ? "date" : "text"} value={(e[k] as string) ?? ""} onChange={ev => setE({ ...e, [k]: ev.target.value || null })} />
          </label>
        ))}
        <label className="text-sm space-y-1 block"><span>{L("Company", "الشركة")}</span>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={e.company_id ?? ""} onChange={ev => setE({ ...e, company_id: ev.target.value || null })}>
            <option value="">—</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <div>
        <h4 className="font-semibold mb-2">{L("Objectives", "الأهداف")} <span className="text-xs text-muted-foreground">({L("total weight", "إجمالي الوزن")}: {objTotal}%)</span></h4>
        <div className="space-y-2">
          {e.objectives.map((o, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-5" placeholder={`${L("Objective", "الهدف")} ${i + 1}`} value={o.objective} onChange={ev => setE({ ...e, objectives: e.objectives.map((x, j) => j === i ? { ...x, objective: ev.target.value } : x) })} />
              <Input className="col-span-3" placeholder="KPI" value={o.kpi} onChange={ev => setE({ ...e, objectives: e.objectives.map((x, j) => j === i ? { ...x, kpi: ev.target.value } : x) })} />
              <Input className="col-span-2" placeholder={L("Target", "المستهدف")} value={o.target} onChange={ev => setE({ ...e, objectives: e.objectives.map((x, j) => j === i ? { ...x, target: ev.target.value } : x) })} />
              <Input className="col-span-2" type="number" placeholder={L("Weight %", "الوزن %")} value={o.weight || ""} onChange={ev => setE({ ...e, objectives: e.objectives.map((x, j) => j === i ? { ...x, weight: Number(ev.target.value) } : x) })} />
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2">
            <Input className="col-span-5" placeholder={L("Budget compliance", "الالتزام بالموازنة")} value={e.budget?.name ?? ""} onChange={ev => setE({ ...e, budget: { ...e.budget!, name: ev.target.value } })} />
            <Input className="col-span-3" placeholder="Budget KPI" value={e.budget?.kpi ?? ""} onChange={ev => setE({ ...e, budget: { ...e.budget!, kpi: ev.target.value } })} />
            <Input className="col-span-2" placeholder={L("Target", "المستهدف")} value={e.budget?.target ?? ""} onChange={ev => setE({ ...e, budget: { ...e.budget!, target: ev.target.value } })} />
            <Input className="col-span-2" type="number" placeholder={L("Weight %", "الوزن %")} value={e.budget?.weight || ""} onChange={ev => setE({ ...e, budget: { ...e.budget!, weight: Number(ev.target.value) } })} />
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-2">{L("Competencies", "الجدارات")} <span className="text-xs text-muted-foreground">({L("total weight", "إجمالي الوزن")}: {compTotal}%)</span></h4>
        <div className="space-y-2">
          {e.competencies.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-4" placeholder={`${L("Competency", "الجدارة")} ${i + 1}`} value={c.name} onChange={ev => setE({ ...e, competencies: e.competencies.map((x, j) => j === i ? { ...x, name: ev.target.value } : x) })} />
              <Input className="col-span-6" placeholder={L("Indicators", "المؤشرات")} value={c.indicators} onChange={ev => setE({ ...e, competencies: e.competencies.map((x, j) => j === i ? { ...x, indicators: ev.target.value } : x) })} />
              <Input className="col-span-2" type="number" placeholder={L("Weight %", "الوزن %")} value={c.weight || ""} onChange={ev => setE({ ...e, competencies: e.competencies.map((x, j) => j === i ? { ...x, weight: Number(ev.target.value) } : x) })} />
            </div>
          ))}
        </div>
      </div>
      <Button onClick={() => onSave(e)}>{L("Save", "حفظ")}</Button>
    </div>
  );
}

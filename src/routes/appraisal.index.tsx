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
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Download, Search, Trash2 } from "lucide-react";
import { bandFor, computeScore, downloadXlsx, type Emp } from "@/lib/appraisal";

export const Route = createFileRoute("/appraisal/")({
  head: () => ({
    meta: [
      { title: "Performance Appraisal Form · Nahdet Misr" },
      { name: "description", content: "Evaluate employees by code: objectives, competencies, penalties, final rating and bell curve per manager." },
      { property: "og:title", content: "Performance Appraisal Form · Nahdet Misr" },
      { property: "og:description", content: "Employee evaluation form with automatic scoring and bell curve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RequireAuth requireCap="viewTP"><Evaluate /></RequireAuth>,
});

type Ev = {
  id: string; employee_id: string; objective_scores: number[]; competency_scores: number[]; budget_score: number | null;
  penalties_count: number; overall_score: number | null; rating: string | null; status: string; comments: string | null; outstanding: { text?: string } | null;
};

function Evaluate() {
  const auth = useAuth();
  const isOD = useIsOD();
  const { lang } = useLang();
  const ar = lang === "ar";
  const L = (en: string, a: string) => (ar ? a : en);
  const { cycles, cycleId, setCycleId, cycle } = useCycles();
  const [emps, setEmps] = useState<Emp[]>([]);
  const [evals, setEvals] = useState<Ev[]>([]);
  const [pens, setPens] = useState<Record<string, number>>({});
  const [code, setCode] = useState("");
  const [emp, setEmp] = useState<Emp | null>(null);
  const [obj, setObj] = useState<number[]>([]);
  const [comp, setComp] = useState<number[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [comments, setComments] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [manager, setManager] = useState("");

  const load = async () => {
    if (!cycleId) return;
    const fetchAll = async (table: "appraisal_employees" | "appraisal_evaluations" | "appraisal_penalties") => {
      const out: unknown[] = [];
      for (let f = 0; ; f += 1000) {
        const { data } = await supabase.from(table).select("*").eq("cycle_id", cycleId).range(f, f + 999);
        out.push(...(data ?? [])); if (!data || data.length < 1000) break;
      }
      return out;
    };
    const [e, v, p] = await Promise.all([fetchAll("appraisal_employees"), fetchAll("appraisal_evaluations"), fetchAll("appraisal_penalties")]);
    setEmps(e as Emp[]); setEvals(v as Ev[]);
    setPens(Object.fromEntries((p as { code: string; penalties_count: number }[]).map(x => [x.code, x.penalties_count])));
  };
  useEffect(() => { load(); setEmp(null); }, [cycleId]);

  const current = emp ? evals.find(v => v.employee_id === emp.id) : undefined;
  const locked = current?.status === "approved" && !isOD;

  const open = (e: Emp) => {
    setEmp(e); setCode(e.code);
    const v = evals.find(x => x.employee_id === e.id);
    setObj(v?.objective_scores ?? e.objectives.map(() => 0));
    setComp(v?.competency_scores ?? e.competencies.map(() => 0));
    setBudget(v?.budget_score ?? null);
    setComments(v?.comments ?? ""); setOutstanding(v?.outstanding?.text ?? "");
  };
  const find = () => {
    const e = emps.find(x => x.code.trim().toLowerCase() === code.trim().toLowerCase());
    if (!e) return toast.error(L("No employee with this code in this cycle (or outside your scope).", "لا يوجد موظف بهذا الكود في الدورة (أو خارج نطاقك)."));
    open(e);
  };

  const penalties = emp ? pens[emp.code] ?? 0 : 0;
  const score = cycle && emp ? computeScore(cycle, emp, obj, comp, budget, penalties) : null;

  const save = async (status: "draft" | "submitted" | "approved") => {
    if (!cycle || !emp || !score) return;
    const payload = {
      cycle_id: cycle.id, employee_id: emp.id, company_id: emp.company_id, sector: emp.sector, department: emp.department,
      objective_scores: obj, competency_scores: comp, budget_score: budget, penalties_count: penalties,
      penalties_result: score.penalties_result, objectives_result: score.objectives_result, competencies_result: score.competencies_result,
      overall_score: Math.round(score.overall * 100) / 100, rating: score.band?.key ?? null, comments, outstanding: { text: outstanding },
      status, ...(status === "approved" ? { approved_by: auth.user?.id } : {}),
    };
    const res = current
      ? await supabase.from("appraisal_evaluations").update(payload).eq("id", current.id)
      : await supabase.from("appraisal_evaluations").insert({ ...payload, created_by: auth.user?.id });
    if (res.error) return toast.error(res.error.message);
    toast.success(L("Saved", "تم الحفظ")); load();
  };
  const del = async () => {
    if (!current || !confirm(L("Delete this evaluation?", "حذف هذا التقييم؟"))) return;
    const { error } = await supabase.from("appraisal_evaluations").delete().eq("id", current.id);
    if (error) toast.error(error.message); else { toast.success(L("Deleted", "تم الحذف")); load(); }
  };

  // Bell curve per manager team
  const managers = useMemo(() => Array.from(new Set(emps.map(e => e.manager_name).filter(Boolean) as string[])).sort(), [emps]);
  const team = useMemo(() => emps.filter(e => !manager || e.manager_name === manager), [emps, manager]);
  const bandLabel = (k: string | null) => { const b = cycle?.rating_bands.find(x => x.key === k); return b ? (ar ? b.label_ar : b.label) : "—"; };
  const curve = useMemo(() => {
    if (!cycle) return [];
    const ids = new Set(team.map(t => t.id));
    const ev = evals.filter(v => ids.has(v.employee_id) && v.overall_score !== null);
    return cycle.rating_bands.map(b => ({
      b, target: Math.round((b.curve / 100) * team.length),
      actual: ev.filter(v => bandFor(cycle.rating_bands, Number(v.overall_score))?.key === b.key).length,
    }));
  }, [cycle, team, evals]);
  const maxBar = Math.max(1, ...curve.flatMap(c => [c.target, c.actual]));

  const exportAll = () => {
    const evMap = new Map(evals.map(v => [v.employee_id, v]));
    downloadXlsx("Appraisal-Results.xlsx", ["Code", "Name", "Sector", "Department", "Manager", "Overall %", "Rating", "Status"],
      emps.map(e => { const v = evMap.get(e.id); return [e.code, e.name, e.sector, e.department, e.manager_name, v?.overall_score ?? "", bandLabel(v?.rating ?? null), v?.status ?? "not started"]; }));
  };

  if (!cycles.length) return <AppraisalShell title={L("Evaluation Form", "فورم التقييم")}><Card className="p-6">{L("No appraisal cycle yet.", "لا توجد دورة تقييم.")}</Card></AppraisalShell>;

  return (
    <AppraisalShell title={L("Evaluation Form", "فورم التقييم")}>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <CyclePicker cycles={cycles} value={cycleId} onChange={setCycleId} label={L("Cycle", "الدورة")} />
        <Button variant="outline" size="sm" onClick={exportAll}><Download className="w-4 h-4" /> {L("Export results", "تصدير النتائج")}</Button>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <Card className="p-6 space-y-5">
          <div className="flex gap-2">
            <Input placeholder={L("Enter employee code", "اكتب كود الموظف")} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && find()} list="emp-codes" />
            <datalist id="emp-codes">{emps.slice(0, 2000).map(e => <option key={e.id} value={e.code}>{e.name}</option>)}</datalist>
            <Button onClick={find}><Search className="w-4 h-4" /> {L("Load", "تحميل")}</Button>
          </div>

          {emp && cycle && score && (
            <>
              <div className="grid sm:grid-cols-3 gap-2 text-sm rounded-lg bg-muted/50 p-4">
                {[[L("Name", "الاسم"), emp.name], [L("Position", "الوظيفة"), emp.position_en], [L("Hiring date", "تاريخ التعيين"), emp.hiring_date],
                  [L("Sector", "القطاع"), emp.sector], [L("Department", "الإدارة"), emp.department], [L("Manager", "المدير"), emp.manager_name],
                  [L("Status", "حالة التقييم"), current?.status ?? L("Not started", "لم يبدأ")]].map(([k, v]) => (
                  <div key={k as string}><span className="text-muted-foreground">{k}: </span><b>{v || "—"}</b></div>
                ))}
              </div>

              <Section title={`${L("Objectives", "الأهداف")} (${cycle.objectives_weight}%)`}>
                {emp.objectives.map((o, i) => (
                  <Row key={i} name={o.objective} sub={`KPI: ${o.kpi} · ${L("Target", "المستهدف")}: ${o.target}`} weight={o.weight}
                    value={obj[i] ?? 0} disabled={locked} onChange={v => setObj(obj.map((x, j) => (j === i ? v : x)).concat(i >= obj.length ? [v] : []))} />
                ))}
                {emp.budget && <Row name={emp.budget.name} sub={`KPI: ${emp.budget.kpi} · ${L("Target", "المستهدف")}: ${emp.budget.target}`} weight={emp.budget.weight} value={budget ?? 0} disabled={locked} onChange={setBudget} />}
                <Result label={L("Objectives result", "نتيجة الأهداف")} v={score.objectives_result} />
              </Section>

              <Section title={`${L("Competencies", "الجدارات")} (${cycle.competencies_weight}%)`}>
                {emp.competencies.map((c, i) => (
                  <Row key={i} name={c.name} sub={c.indicators} weight={c.weight} value={comp[i] ?? 0} disabled={locked}
                    onChange={v => setComp(comp.map((x, j) => (j === i ? v : x)).concat(i >= comp.length ? [v] : []))} />
                ))}
                <Result label={L("Competencies result", "نتيجة الجدارات")} v={score.competencies_result} />
              </Section>

              <Section title={L("Penalties", "الجزاءات")}>
                <p className="text-sm">{L("Penalties count (from Personnel sheet)", "عدد الجزاءات (من شيت شؤون العاملين)")}: <b>{penalties}</b> · {L("Deduction", "الخصم")}: <b>{score.penalties_result.toFixed(2)}%</b></p>
              </Section>

              <Section title={L("Outstanding performance & comments", "الأداء المتميز والملاحظات")}>
                <Textarea placeholder={L("Outstanding achievements", "إنجازات متميزة")} value={outstanding} disabled={locked} onChange={e => setOutstanding(e.target.value)} />
                <Textarea placeholder={L("Comments", "ملاحظات")} value={comments} disabled={locked} onChange={e => setComments(e.target.value)} />
              </Section>

              <div className="rounded-lg bg-primary text-primary-foreground p-4 flex items-center justify-between">
                <span className="font-semibold">{L("Overall score", "النتيجة النهائية")}</span>
                <span className="text-2xl font-bold">{score.overall.toFixed(2)}% · {score.band ? (ar ? score.band.label_ar : score.band.label) : ""}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {!locked && <Button variant="outline" onClick={() => save("draft")}>{L("Save draft", "حفظ كمسودة")}</Button>}
                {!locked && <Button onClick={() => save("submitted")}>{L("Submit", "إرسال")}</Button>}
                {isOD && <Button variant="secondary" onClick={() => save("approved")}><CheckCircle2 className="w-4 h-4" /> {L("Approve", "اعتماد")}</Button>}
                {current && (isOD || auth.canDelete) && <Button variant="destructive" onClick={del}><Trash2 className="w-4 h-4" /> {L("Delete evaluation", "حذف التقييم")}</Button>}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5 space-y-4 h-fit">
          <h3 className="font-bold">{L("Bell curve", "البيل كيرف")}</h3>
          <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={manager} onChange={e => setManager(e.target.value)}>
            <option value="">{L("All teams", "كل الفرق")}</option>
            {managers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <p className="text-sm text-muted-foreground">{L("Team size", "عدد الفريق")}: {team.length}</p>
          <div className="flex items-end gap-2 h-40 border-b">
            {curve.map(c => (
              <div key={c.b.key} className="flex-1 flex items-end gap-0.5 h-full">
                <div className="flex-1 bg-muted rounded-t" style={{ height: `${(c.target / maxBar) * 100}%` }} title="target" />
                <div className="flex-1 bg-primary rounded-t" style={{ height: `${(c.actual / maxBar) * 100}%` }} title="actual" />
              </div>
            ))}
          </div>
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground"><th className="text-start">{L("Rating", "التقدير")}</th><th>%</th><th>{L("Target", "المستهدف")}</th><th>{L("Actual", "الفعلي")}</th></tr></thead>
            <tbody>{curve.map(c => (
              <tr key={c.b.key} className={c.actual > c.target ? "text-destructive font-semibold" : ""}>
                <td>{ar ? c.b.label_ar : c.b.label}</td><td className="text-center">{c.b.curve}</td><td className="text-center">{c.target}</td><td className="text-center">{c.actual}</td>
              </tr>))}</tbody>
          </table>
          <p className="text-xs text-muted-foreground">{L("Grey = target, blue = actual. Red rows exceed the allowed distribution.", "الرمادي = المستهدف، الأزرق = الفعلي. الصفوف الحمراء تتجاوز التوزيع المسموح.")}</p>
          <div className="max-h-72 overflow-y-auto text-xs space-y-1">
            {team.map(t => { const v = evals.find(x => x.employee_id === t.id); return (
              <button key={t.id} onClick={() => open(t)} className="w-full flex justify-between px-2 py-1 rounded hover:bg-muted text-start">
                <span>{t.code} · {t.name}</span><span>{v?.overall_score != null ? `${Number(v.overall_score).toFixed(1)}%` : "—"}</span>
              </button>); })}
          </div>
        </Card>
      </div>
    </AppraisalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><h3 className="font-semibold border-b pb-1">{title}</h3>{children}</div>;
}
function Row({ name, sub, weight, value, onChange, disabled }: { name: string; sub?: string; weight: number; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center text-sm">
      <div className="col-span-8"><div className="font-medium">{name}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</div>
      <div className="col-span-1 text-center text-muted-foreground">{weight}%</div>
      <div className="col-span-3"><Input type="number" min={0} max={120} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} placeholder="%" /></div>
    </div>
  );
}
function Result({ label, v }: { label: string; v: number }) {
  return <div className="text-sm text-end">{label}: <b>{v.toFixed(2)}%</b></div>;
}

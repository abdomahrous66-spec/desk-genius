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
import { ArrowRight, Check, Download, Loader2, Pencil, X } from "lucide-react";
import { TP_COLUMNS, TP_EDIT_FIELDS, NUMBER_KEYS, STATUS_LABELS, type TrainingNeed } from "@/lib/training";

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
  const { companies } = useStructure();
  const [rows, setRows] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"new" | "plan">("new");
  const [editing, setEditing] = useState<TrainingNeed | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
    const { error } = await supabase.from("training_needs").update({ status: "approved" }).in("id", pending.map(r => r.id));
    if (error) { toast.error(error.message); return; }
    toast.success(`تم اعتماد ${pending.length} احتياج`);
    load();
  };

  const openEdit = (r: TrainingNeed) => {
    setEditing(r);
    setDraft(Object.fromEntries(TP_EDIT_FIELDS.map(f => [f.key as string, (r[f.key] ?? "") as string])));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      payload[k] = v === "" ? null : NUMBER_KEYS.has(k) ? Number(v) : v;
    }
    const { error } = await supabase.from("training_needs").update(payload as never).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم حفظ بيانات خطة التدريب");
    setEditing(null);
    load();
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
            <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 ml-1" /> تصدير تقرير Excel</Button>
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
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="w-4 h-4 ml-1" /> تعديل</Button>
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

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto" dir="rtl">
          <DialogHeader><DialogTitle>بيانات خطة التدريب — {editing?.training_topic}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-3 gap-4">
            {TP_EDIT_FIELDS.map(f => (
              <div key={f.key as string} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <Input type={f.type} value={draft[f.key as string] ?? ""}
                  onChange={e => setDraft(p => ({ ...p, [f.key as string]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />} حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

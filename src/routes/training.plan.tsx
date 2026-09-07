import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLang, useT } from "@/hooks/use-i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
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
import { ArrowRight, Check, Download, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { TP_COLUMNS, TP_EDIT_FIELDS, NUMBER_KEYS, STATUS_LABELS, mapPlanSheetRow, type TrainingNeed } from "@/lib/training";

const SEARCH_FIELDS: { key: string; label: string }[] = [
  { key: "all", label: "All fields" },
  { key: "employee_code", label: "Employee code" },
  { key: "employee_name", label: "Employee name" },
  { key: "training_topic", label: "Training topic" },
  { key: "sector", label: "Sector" },
  { key: "department", label: "Department" },
  { key: "position_title", label: "Position" },
  { key: "company_id", label: "Company" },
  { key: "training_type", label: "Training type" },
  { key: "training_provider", label: "Training provider" },
  { key: "training_status", label: "Training status" },
  { key: "attendance_status", label: "Attendance status" },
  { key: "implementation_year", label: "Implementation year" },
];

export const Route = createFileRoute("/training/plan")({
  head: () => ({
    meta: [
      { title: "Training Plan (TP) · Nahdet Misr" },
      { name: "description", content: "Approve training needs, manage the annual training plan, and export reports." },
      { property: "og:title", content: "Training Plan (TP) · Nahdet Misr" },
      { property: "og:description", content: "Approve training needs, manage the annual training plan, and export reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<RequireAuth requireCap="viewTP"><PlanPage /></RequireAuth>),
});

const dict = {
  en: {
    title: "Training Plan (TP) · OD Team",
    home: "Home",
    pending: "Pending Approval",
    plan: "Training Plan",
    approveAll: "Approve All",
    deleteShown: "Delete Shown",
    exportExcel: "Export Excel Report",
    planTemplate: "Plan Template",
    uploadSheet: "Upload Training Sheet",
    addRecord: "Add Record",
    companyOptional: "Company (optional)",
    searchPlaceholder: "Search by code, name, training, sector, or position…",
    clear: "Clear",
    results: "Results",
    noData: "No data available.",
    colEmployee: "Employee",
    colSector: "Sector",
    colDepartment: "Department",
    colPosition: "Position",
    colTopic: "Training Topic",
    colProvider: "Provider",
    colCost: "Cost",
    colStatus: "Status",
    colActions: "Actions",
    edit: "Edit",
    approvedToast: "Approved and moved to the training plan",
    rejectedToast: "Rejected",
    confirmDelete: "Are you sure you want to delete this training record?",
    noRecordsToDelete: "No records to delete",
    confirmDeleteAll: (n: number) => `Are you sure you want to delete all records (${n})? This cannot be undone.`,
    confirmDeleteFinal: "Final confirmation: all records will be permanently deleted.",
    deletedOne: "Record deleted",
    deletedAll: (n: number) => `${n} records deleted`,
    approvedAll: (n: number) => `${n} needs approved`,
    topicRequired: "Training topic is required",
    addedToPlan: "Record added to the training plan",
    savedPlan: "Training plan data saved",
    noValidRows: "No valid rows — check the Training Topics column",
    uploadFailedAt: "Upload failed at record ",
    uploadedToPlan: "records uploaded to the training plan",
    invalidFile: "Invalid file",
    addRecordDialog: "Add Training Record",
    planDataDialog: "Training Plan Data —",
    cancel: "Cancel",
    save: "Save",
  },
  ar: {
    title: "خطة التدريب (TP) · فريق الـ OD",
    home: "الرئيسية",
    pending: "طلبات بانتظار الاعتماد",
    plan: "خطة التدريب",
    approveAll: "اعتماد الكل",
    deleteShown: "حذف المعروض",
    exportExcel: "تصدير تقرير Excel",
    planTemplate: "تمبلت الخطة",
    uploadSheet: "رفع شيت التدريب",
    addRecord: "إضافة سجل",
    companyOptional: "الشركة (اختياري)",
    searchPlaceholder: "ابحث بالكود أو الاسم أو التدريب أو القطاع أو الوظيفة…",
    clear: "مسح",
    results: "النتائج",
    noData: "لا توجد بيانات.",
    colEmployee: "الموظف",
    colSector: "القطاع",
    colDepartment: "الإدارة",
    colPosition: "المسمى",
    colTopic: "الموضوع التدريبي",
    colProvider: "المزود",
    colCost: "التكلفة",
    colStatus: "الحالة",
    colActions: "إجراءات",
    edit: "تعديل",
    approvedToast: "تم الاعتماد وترحيله لخطة التدريب",
    rejectedToast: "تم الرفض",
    confirmDelete: "متأكد إنك عايز تحذف التدريب ده؟",
    noRecordsToDelete: "لا توجد سجلات للحذف",
    confirmDeleteAll: (n: number) => `متأكد إنك عايز تحذف كل السجلات (${n})؟ لا يمكن التراجع.`,
    confirmDeleteFinal: "تأكيد أخير: سيتم حذف كل السجلات نهائياً.",
    deletedOne: "تم حذف السجل",
    deletedAll: (n: number) => `تم حذف ${n} سجل`,
    approvedAll: (n: number) => `تم اعتماد ${n} احتياج`,
    topicRequired: "الموضوع التدريبي مطلوب",
    addedToPlan: "تمت إضافة السجل لخطة التدريب",
    savedPlan: "تم حفظ بيانات خطة التدريب",
    noValidRows: "مفيش صفوف صالحة — تأكد من عمود Training Topics",
    uploadFailedAt: "فشل الرفع عند السجل ",
    uploadedToPlan: "سجل لخطة التدريب",
    invalidFile: "ملف غير صالح",
    addRecordDialog: "إضافة سجل تدريب",
    planDataDialog: "بيانات خطة التدريب —",
    cancel: "إلغاء",
    save: "حفظ",
  },
};

function PlanPage() {
  const { dir } = useLang();
  const t = useT(dict);
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
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<string>("all");

  const companyName = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies]);

  const load = async () => {
    setLoading(true);
    const all: TrainingNeed[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase.from("training_needs").select("*")
        .order("created_at", { ascending: false }).range(from, from + PAGE - 1);
      if (error) { toast.error(error.message); break; }
      const batch = (data as unknown as TrainingNeed[]) ?? [];
      all.push(...batch);
      if (batch.length < PAGE) break;
    }
    setRows(all);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pending = rows.filter(r => r.status === "new");
  const planned = rows.filter(r => r.status === "approved" || r.status === "completed");
  const baseList = tab === "new" ? pending : planned;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseList;
    const match = (v: unknown) => v != null && String(v).toLowerCase().includes(q);
    return baseList.filter(r => {
      if (searchField === "all") {
        return Object.entries(r).some(([k, v]) => match(k === "company_id" ? companyName[String(v)] ?? v : v));
      }
      if (searchField === "company_id") return match(companyName[r.company_id ?? ""] ?? "");
      return match((r as unknown as Record<string, unknown>)[searchField]);
    });
  }, [baseList, search, searchField, companyName]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("training_needs").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? t.approvedToast : t.rejectedToast);
    load();
  };

  const approveAll = async () => {
    if (!pending.length) return;
    const ids = pending.map(r => r.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await supabase.from("training_needs").update({ status: "approved" }).in("id", ids.slice(i, i + 500));
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t.approvedAll(pending.length));
    load();
  };

  const deleteOne = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    const { error } = await supabase.from("training_needs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t.deletedOne);
    load();
  };

  const deleteAll = async () => {
    const target = list;
    if (!target.length) { toast.error(t.noRecordsToDelete); return; }
    if (!confirm(t.confirmDeleteAll(target.length))) return;
    if (!confirm(t.confirmDeleteFinal)) return;
    const ids = target.map(r => r.id);
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await supabase.from("training_needs").delete().in("id", ids.slice(i, i + 500));
      if (error) { toast.error(error.message); return; }
    }
    toast.success(t.deletedAll(target.length));
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
      if (!draft.training_topic?.trim()) { toast.error(t.topicRequired); return; }
      setSaving(true);
      const { error: cErr } = await supabase.from("training_needs").insert({
        ...payload, training_topic: draft.training_topic.trim(),
        created_by: auth.user!.id, company_id: uploadCompany || null, status: "approved",
      } as never);
      setSaving(false);
      if (cErr) { toast.error(cErr.message); return; }
      toast.success(t.addedToPlan);
      setCreating(false);
      load();
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("training_needs").update(payload as never).eq("id", editing!.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t.savedPlan);
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
          return { ...row, company_id: cid ?? null, created_by: auth.user!.id, status: "approved" } as Record<string, unknown>;
        })
        .filter(r => r.training_topic && String(r.training_topic).trim());
      if (!mapped.length) { toast.error(t.noValidRows); return; }
      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < mapped.length; i += CHUNK) {
        const { error } = await supabase.from("training_needs").insert(mapped.slice(i, i + CHUNK) as never);
        if (error) { toast.error(`${t.uploadFailedAt}${inserted + 1}: ` + error.message); return; }
        inserted += Math.min(CHUNK, mapped.length - i);
      }
      toast.success(`${inserted} ${t.uploadedToPlan}`);
      setTab("plan");
      load();
    } catch {
      toast.error(t.invalidFile);
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
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-bold">{t.title}</div>
          <div className="flex items-center gap-2">
            <LanguageToggle className="text-primary-foreground hover:bg-white/15" />
            <Link to="/"><Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15"><ArrowRight className="w-4 h-4 ml-1" /> {t.home}</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <Button variant={tab === "new" ? "default" : "outline"} onClick={() => setTab("new")}>{t.pending} ({pending.length})</Button>
            <Button variant={tab === "plan" ? "default" : "outline"} onClick={() => setTab("plan")}>{t.plan} ({planned.length})</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tab === "new" && <Button variant="secondary" onClick={approveAll} disabled={!pending.length}><Check className="w-4 h-4 ml-1" /> {t.approveAll}</Button>}
            {auth.canDelete && <Button variant="destructive" onClick={deleteAll} disabled={loading || !list.length}><Trash2 className="w-4 h-4 ml-1" /> {t.deleteShown} ({list.length})</Button>}
            <Button variant="outline" onClick={exportReport}><Download className="w-4 h-4 ml-1" /> {t.exportExcel}</Button>
            <Button variant="outline" onClick={downloadPlanTemplate}><Download className="w-4 h-4 ml-1" /> {t.planTemplate}</Button>
            <label>
              <input type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onUploadPlan(f); e.currentTarget.value = ""; }} />
              <Button variant="outline" asChild disabled={uploading}>
                <span>{uploading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Upload className="w-4 h-4 ml-1" />} {t.uploadSheet}</span>
              </Button>
            </label>
            <Button onClick={openCreate}><Plus className="w-4 h-4 ml-1" /> {t.addRecord}</Button>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={uploadCompany} onChange={e => setUploadCompany(e.target.value)}>
              <option value="">{t.companyOptional}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pr-9" placeholder={t.searchPlaceholder}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={searchField} onChange={e => setSearchField(e.target.value)}>
            {SEARCH_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}><X className="w-4 h-4 ml-1" /> {t.clear}</Button>
          )}
          <span className="text-sm text-muted-foreground">{t.results}: {list.length}</span>
        </Card>


        <Card className="p-4">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : list.length === 0 ? (
            <p className="text-muted-foreground p-4">{t.noData}</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[t.colEmployee, t.colSector, t.colDepartment, t.colPosition, t.colTopic, t.colProvider, t.colCost, t.colStatus, t.colActions].map(h => (
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
                            <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="w-4 h-4 ml-1" /> {t.edit}</Button>
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto" dir={dir}>
          <DialogHeader><DialogTitle>{creating ? t.addRecordDialog : `${t.planDataDialog} ${editing?.training_topic}`}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>{t.cancel}</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />} {t.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

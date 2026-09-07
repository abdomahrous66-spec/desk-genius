import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Loader2, Plus, Trash2, Upload, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { useStructure, type Position } from "@/hooks/use-structure";
import { useLang, useT } from "@/hooks/use-i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/admin/structure")({
  component: () => (<RequireAuth requireCap="manageStructure"><AdminStructurePage /></RequireAuth>),
  head: () => ({
    meta: [
      { title: "Manage Organizational Structure" },
      { name: "description", content: "Create companies, import structure via Excel, and manage positions." },
    ],
  }),
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

const dict = {
  en: {
    home: "Home",
    adminOnly: "This page is for admins only",
    title: "Manage Organizational Structure",
    subtitle: "Create companies, upload an Excel sheet to auto-update the structure, or add/remove positions manually.",
    unknownError: "Unknown error",
    failedAddCompany: "Failed to add company",
    companyAdded: "Company added",
    failedUpdateLogo: "Failed to update logo",
    logoUpdated: "Logo updated",
    confirmDeleteCompanyWithPositions: "This company has positions — they will all be deleted. Are you sure?",
    confirmDeleteCompany: "Delete this company permanently?",
    failedDeletePositions: "Failed to delete positions",
    failedDelete: "Failed to delete",
    deleted: "Deleted",
    companyAndTitleRequired: "Company and position title are required",
    failedAdd: "Failed to add",
    positionAdded: "Position added",
    confirmDelete: "Are you sure you want to delete?",
    templateDownloaded: "Template downloaded",
    reportDownloaded: "Report downloaded",
    jobCountHeader: "Job Count",
    selectCompanyFirst: "Select a company first",
    noJobTitleColumn: "no job title column",
    empty: "empty",
    noPositionsFound: "No positions found. Sheets",
    failedDeleteExisting: "Failed to delete existing data",
    failedInsertAtRow: "Failed to insert at row",
    importedSummary: (mode: "replace" | "append", count: number, sheets: number) =>
      `${mode === "replace" ? "Replaced" : "Added"} ${count} position(s) from ${sheets} sheet(s)`,
    failedReadFile: "Failed to read file",
    companiesSection: "Companies",
    newCompanyName: "New company name",
    newCompanyNamePlaceholder: "e.g. Company X",
    logoUrlLabel: "Company logo URL (optional)",
    logoUrlPlaceholder: "https://... or /__l5e/assets-v1/...",
    addCompany: "Add Company",
    logoUrlInputPlaceholder: "Logo URL",
    deleteCompanyTitle: "Delete company",
    noCompaniesYet: "No companies yet.",
    selectCompany: "Select company",
    allCompanies: "All companies",
    importMode: "Import mode",
    appendMode: "Append to existing",
    replaceMode: "Replace all",
    uploadExcel: "Upload Excel Sheet",
    downloadTemplate: "Download Template",
    downloadStructureReport: "Download Structure Report",
    refresh: "Refresh",
    expectedColumns: "Expected columns: Sector, Department, Section, Position (required), Manager, Job Code. Supports Arabic and English. (Subsection is optional and will be saved if present in the sheet.)",
    addPositionManually: "Add Position Manually",
    companyRequired: "Company *",
    choose: "Choose",
    positionTitleRequired: "Position Title *",
    add: "Add",
    positionsSection: (n: number) => `Positions (${n})`,
  },
  ar: {
    home: "الرئيسية",
    adminOnly: "الصفحة دي للأدمن فقط",
    title: "إدارة الهيكل التنظيمي",
    subtitle: "إنشاء شركات، رفع شيت Excel لتحديث الهيكل تلقائياً، أو إضافة/حذف وظائف يدوياً.",
    unknownError: "خطأ غير معروف",
    failedAddCompany: "فشل إضافة الشركة",
    companyAdded: "تمت إضافة الشركة",
    failedUpdateLogo: "فشل تحديث الشعار",
    logoUpdated: "تم تحديث الشعار",
    confirmDeleteCompanyWithPositions: "الشركة فيها وظائف — هيتم حذفها كلها. متأكد؟",
    confirmDeleteCompany: "حذف الشركة نهائياً؟",
    failedDeletePositions: "فشل حذف الوظائف",
    failedDelete: "فشل الحذف",
    deleted: "تم الحذف",
    companyAndTitleRequired: "الشركة + اسم الوظيفة إجباري",
    failedAdd: "فشل الإضافة",
    positionAdded: "تمت إضافة الوظيفة",
    confirmDelete: "متأكد من الحذف؟",
    templateDownloaded: "تم تنزيل التمبلت",
    reportDownloaded: "تم تنزيل التقرير",
    jobCountHeader: "عدد الوظائف",
    selectCompanyFirst: "اختر الشركة الأول",
    noJobTitleColumn: "مافيش عمود اسم وظيفة",
    empty: "فاضي",
    noPositionsFound: "مالقيتش وظائف. الشيتات",
    failedDeleteExisting: "فشل حذف الموجود",
    failedInsertAtRow: "فشل الإدخال عند الصف",
    importedSummary: (mode: "replace" | "append", count: number, sheets: number) =>
      `تم ${mode === "replace" ? "استبدال" : "إضافة"} ${count} وظيفة من ${sheets} شيت`,
    failedReadFile: "فشل قراءة الملف",
    companiesSection: "الشركات",
    newCompanyName: "اسم شركة جديدة",
    newCompanyNamePlaceholder: "مثال: شركة X",
    logoUrlLabel: "رابط شعار الشركة (اختياري)",
    logoUrlPlaceholder: "https://... أو /__l5e/assets-v1/...",
    addCompany: "إضافة شركة",
    logoUrlInputPlaceholder: "رابط الشعار",
    deleteCompanyTitle: "حذف الشركة",
    noCompaniesYet: "مافيش شركات لسه.",
    selectCompany: "اختر الشركة",
    allCompanies: "كل الشركات",
    importMode: "وضع الاستيراد",
    appendMode: "إضافة على الموجود",
    replaceMode: "استبدال الكل",
    uploadExcel: "رفع شيت Excel",
    downloadTemplate: "تنزيل التمبلت",
    downloadStructureReport: "تنزيل تقرير الهيكل",
    refresh: "تحديث",
    expectedColumns: "الأعمدة المتوقعة: Sector, Department, Section, Position (الإجباري), Manager, Job Code. يدعم العربية والإنجليزية. (Subsection اختياري لو موجود في الشيت هيتحفظ.)",
    addPositionManually: "إضافة وظيفة يدوياً",
    companyRequired: "الشركة *",
    choose: "اختر",
    positionTitleRequired: "Position Title *",
    add: "إضافة",
    positionsSection: (n: number) => `الوظائف (${n})`,
  },
};

function AdminStructurePage() {
  const auth = useAuth();
  const { dir } = useLang();
  const t = useT(dict);
  const { companies, positions, reload, loading } = useStructure();
  const childCompanies = useMemo(() => companies.filter(c => c.parent_id), [companies]);
  const [companyId, setCompanyId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const fileRef = useRef<HTMLInputElement>(null);
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
        <Card className="p-8 text-center max-w-md"><h2 className="font-bold mb-2">{t.adminOnly}</h2><Link to="/"><Button>{t.home}</Button></Link></Card>
      </div>
    );
  }

  const errMsg = (e: unknown) => {
    const x = e as { message?: string; hint?: string; code?: string; details?: string } | null;
    if (!x) return t.unknownError;
    return [x.message, x.details, x.hint, x.code].filter(Boolean).join(" — ") || t.unknownError;
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
    if (error) { toast.error(`${t.failedAddCompany}: ${errMsg(error)}`); return; }
    toast.success(t.companyAdded);
    setNewCompanyName("");
    setNewCompanyLogoUrl("");
    const newId = data?.[0]?.id;
    if (newId) setCompanyId(newId);
    reload();
  };

  const updateCompanyLogo = async (companyId: string, url: string) => {
    setUploadingLogoFor(companyId);
    const { error } = await (supabase as unknown as { from: (t: string) => { update: (r: unknown) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("companies").update({ logo_url: url || null }).eq("id", companyId);
    setUploadingLogoFor(null);
    if (error) { toast.error(`${t.failedUpdateLogo}: ${errMsg(error)}`); return; }
    toast.success(t.logoUpdated);
    reload();
  };

  const deleteCompany = async (id: string) => {
    const hasPositions = positions.some(p => p.company_id === id);
    if (hasPositions) {
      if (!confirm(t.confirmDeleteCompanyWithPositions)) return;
      const delPos = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
        .from("positions").delete().eq("company_id", id);
      if (delPos.error) { toast.error(`${t.failedDeletePositions}: ${errMsg(delPos.error)}`); return; }
    } else if (!confirm(t.confirmDeleteCompany)) return;
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("companies").delete().eq("id", id);
    if (error) { toast.error(`${t.failedDelete}: ${errMsg(error)}`); return; }
    toast.success(t.deleted);
    if (companyId === id) setCompanyId("");
    reload();
  };

  const addPosition = async () => {
    if (!newRow.company_id || !newRow.position_title) {
      toast.error(t.companyAndTitleRequired);
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
    if (error) { toast.error(`${t.failedAdd}: ${errMsg(error)}`); return; }
    toast.success(t.positionAdded);
    setNewRow({ ...newRow, position_title: "", manager_position: "", job_code: "" });
    reload();
  };

  const deletePosition = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;
    const { error } = await (supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } })
      .from("positions").delete().eq("id", id);
    if (error) { toast.error(`${t.failedDelete}: ${errMsg(error)}`); return; }
    toast.success(t.deleted);
    reload();
  };
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const headers = ["Sector", "Department", "Section", "Position", "Manager", "Job Code"];
    const sample = [
      ["القطاع التجاري", "إدارة المبيعات", "قسم مبيعات القاهرة", "مدير مبيعات", "مدير عام المبيعات", "S-001"],
      ["القطاع التجاري", "إدارة المبيعات", "قسم مبيعات القاهرة", "أخصائي مبيعات", "مدير مبيعات", "S-002"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws["!cols"] = headers.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Structure");
    XLSX.writeFile(wb, "Structure-Template.xlsx");
    toast.success(t.templateDownloaded);
  };

  const downloadReport = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const nameOf = (id: string) => companies.find(c => c.id === id)?.name ?? "-";

    const all = (companyId ? positions.filter(p => p.company_id === companyId) : positions).map(p => ({
      Company: nameOf(p.company_id),
      Sector: p.sector || "-",
      Department: p.department || "-",
      Section: p.section || "-",
      Position: p.position_title,
      Manager: p.manager_position || "-",
      "Job Code": p.job_code || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(all);
    ws["!cols"] = [30, 24, 24, 24, 30, 28, 14].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, "Positions");

    const counts = new Map<string, number>();
    for (const p of positions) {
      const key = [nameOf(p.company_id), p.sector || "-", p.department || "-", p.section || "-"].join("||");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const summary = [...counts.entries()].map(([k, n]) => {
      const [Company, Sector, Department, Section] = k.split("||");
      return { Company, Sector, Department, Section, [t.jobCountHeader]: n };
    });
    const ws2 = XLSX.utils.json_to_sheet(summary);
    ws2["!cols"] = [30, 24, 24, 24, 14].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws2, "Structure Summary");

    XLSX.writeFile(wb, `Structure-Report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t.reportDownloaded);
  };


  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!companyId) { toast.error(t.selectCompanyFirst); if (fileRef.current) fileRef.current.value = ""; return; }
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
        if (!aoa.length) { sheetsSkipped.push({ name: sheetName, reason: t.empty }); continue; }

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
          sheetsSkipped.push({ name: sheetName, reason: t.noJobTitleColumn });
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
        toast.error(`${t.noPositionsFound}: ${summary || sheetsScanned.join("، ")}`);
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
        if (del.error) { toast.error(`${t.failedDeleteExisting}: ${errMsg(del.error)}`); return; }
      }

      for (let i = 0; i < rowsForDb.length; i += 500) {
        const ins = await sb.from("positions").insert(rowsForDb.slice(i, i + 500));
        if (ins.error) {
          toast.error(`${t.failedInsertAtRow} ${i}: ${errMsg(ins.error)}`);
          return;
        }
      }
      toast.success(t.importedSummary(importMode, rowsForDb.length, sheetsScanned.length - sheetsSkipped.length));
      reload();
    } catch (err) {
      console.error(err);
      toast.error(t.failedReadFile);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen py-8" dir={dir}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" /> {t.home}
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t.title}</h1>
        <p className="text-muted-foreground mb-6">{t.subtitle}</p>

        <Card className="p-5 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> {t.companiesSection}</h2>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-[220px]">
              <Label>{t.newCompanyName}</Label>
              <Input value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder={t.newCompanyNamePlaceholder} />
            </div>
            <div className="flex-1 min-w-[240px]">
              <Label>{t.logoUrlLabel}</Label>
              <Input value={newCompanyLogoUrl} onChange={(e) => setNewCompanyLogoUrl(e.target.value)} placeholder={t.logoUrlPlaceholder} />
            </div>
            <Button onClick={createCompany} disabled={creatingCompany || !newCompanyName.trim()} className="gap-2">
              {creatingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t.addCompany}
            </Button>
          </div>
          <div className="space-y-2">
            {childCompanies.map(c => (
              <div key={c.id} className="flex items-center gap-3 bg-accent/20 rounded-lg p-2 border border-border/50">
                <div className="w-10 h-10 rounded-md bg-white p-0.5 flex items-center justify-center border border-border/40 shrink-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">No logo</span>
                  )}
                </div>
                <span className="font-medium text-sm flex-1">{c.name}</span>
                <Input
                  defaultValue={c.logo_url ?? ""}
                  placeholder={t.logoUrlInputPlaceholder}
                  className="max-w-xs h-8 text-xs"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (c.logo_url ?? "")) updateCompanyLogo(c.id, v);
                  }}
                  disabled={uploadingLogoFor === c.id}
                />
                <button onClick={() => deleteCompany(c.id)} className="text-destructive hover:text-destructive/80 p-1" title={t.deleteCompanyTitle}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {childCompanies.length === 0 && <span className="text-xs text-muted-foreground">{t.noCompaniesYet}</span>}
          </div>
        </Card>

        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <Label>{t.selectCompany}</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder={t.allCompanies} /></SelectTrigger>
                <SelectContent>
                  {childCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[160px]">
              <Label>{t.importMode}</Label>
              <Select value={importMode} onValueChange={(v) => setImportMode(v as "replace" | "append")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">{t.appendMode}</SelectItem>
                  <SelectItem value="replace">{t.replaceMode}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
            <Button onClick={() => fileRef.current?.click()} disabled={busy || !companyId} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {t.uploadExcel}
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="w-4 h-4" /> {t.downloadTemplate}</Button>
            <Button variant="outline" onClick={downloadReport} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> {t.downloadStructureReport}</Button>
            <Button variant="outline" onClick={() => reload()} className="gap-2"><RefreshCw className="w-4 h-4" /> {t.refresh}</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {t.expectedColumns}
          </p>
        </Card>

        <Card className="p-5 mb-6">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> {t.addPositionManually}</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>{t.companyRequired}</Label>
              <Select value={newRow.company_id} onValueChange={(v) => setNewRow({ ...newRow, company_id: v })}>
                <SelectTrigger><SelectValue placeholder={t.choose} /></SelectTrigger>
                <SelectContent>{childCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Sector</Label><Input value={newRow.sector} onChange={(e) => setNewRow({ ...newRow, sector: e.target.value })} /></div>
            <div><Label>Department</Label><Input value={newRow.department} onChange={(e) => setNewRow({ ...newRow, department: e.target.value })} /></div>
            <div><Label>Section</Label><Input value={newRow.section} onChange={(e) => setNewRow({ ...newRow, section: e.target.value })} /></div>
            <div><Label>Manager (Reports To)</Label><Input value={newRow.manager_position} onChange={(e) => setNewRow({ ...newRow, manager_position: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>{t.positionTitleRequired}</Label><Input value={newRow.position_title} onChange={(e) => setNewRow({ ...newRow, position_title: e.target.value })} /></div>
            <div><Label>Job Code</Label><Input value={newRow.job_code} onChange={(e) => setNewRow({ ...newRow, job_code: e.target.value })} /></div>
          </div>
          <div className="mt-3"><Button onClick={addPosition} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Plus className="w-4 h-4 ml-1.5" />} {t.add}</Button></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 border-b font-semibold">{t.positionsSection(filtered.length)}</div>
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

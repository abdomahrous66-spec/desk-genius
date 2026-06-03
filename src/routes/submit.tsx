import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Info, Languages, Plus, Trash2, Upload, Wand2 } from "lucide-react";
import positionsData from "@/data/positions.json";
import { RequireAuth } from "@/components/RequireAuth";
import { useScopes } from "@/hooks/use-scopes";

export const Route = createFileRoute("/submit")({
  validateSearch: (s: Record<string, unknown>) => ({
    sector: typeof s.sector === "string" ? s.sector : "",
    department: typeof s.department === "string" ? s.department : "",
    position: typeof s.position === "string" ? s.position : "",
  }),
  component: () => (<RequireAuth><SubmitPage /></RequireAuth>),
});

type Lang = "ar" | "en";
const POSITIONS = positionsData as Record<string, Record<string, string[]>>;
const NEW_POSITION = "__NEW__";


const T = {
  ar: {
    backHome: "الرجوع للرئيسية",
    pastRequests: "الطلبات السابقة",
    badge: "تحليل وظيفي ذكي",
    title: "بيانات الوظيفة",
    subtitle: "املأ الحقول المطلوبة. الحقول الاختيارية ممكن تسيبها لو مش متوفر معاك.",
    info: "كل الحقول إجبارية ما عدا اللي مكتوب جنبها (اختياري).",
    sector: "القطاع (Sector) *",
    sectorPh: "اختر القطاع",
    department: "القسم / الإدارة *",
    departmentPh: "اختر القسم",
    position: "المسمى الوظيفي *",
    positionPh: "اختر الوظيفة",
    newPosition: "+ وظيفة جديدة",
    newPositionTitle: "اسم الوظيفة الجديدة *",
    newPositionTitlePh: "مثال: Senior Data Analyst",
    approvedBy: "موافقة من *",
    approvedByPh: "اسم الشخص الموافق على إنشاء الوظيفة الجديدة",
    location: "الموقع (Location) *",
    locationPh: "اختر الموقع",
    reportsTo: "Reporting to (المنصب المباشر) *",
    reportsToPh: "مثال: CEO / Sales Director",
    directReports: "أسماء/مسميات المرؤوسين المباشرين (اختياري)",
    directReportsPh: "كل مرؤوس في سطر",
    purpose: "الهدف من الوظيفة (Main Job Purpose) *",
    purposePh: "إيه الهدف الأساسي من الوظيفة؟",
    tasks: "المهام والمسؤوليات *",
    tasksPh: "اكتب المهام والمسؤوليات. الـ AI هيقسمها لـ Responsibilities و KRAs.",
    qualifications: "المؤهلات والخبرات والمهارات *",
    qualificationsPh: "Education, Experience, Computer Skills, Languages...",
    workCond: "ظروف العمل + Internal & External Communication *",
    workCondPh: "ساعات عمل، مكان، الأقسام الداخلية، الجهات الخارجية...",
    notes: "ملاحظات إضافية — اختياري",
    notesPh: "أي معلومات تانية مهمة (اختياري)",
    collar: "نوع الوظيفة (Collar) *",
    collarPh: "اختر نوع الوظيفة",
    blueCollar: "Blue Collar",
    whiteCollar: "White Collar",
    outputLang: "لغة مخرجات الـ JD *",
    outputLangPh: "اختر اللغة",
    outputLangAr: "عربي",
    outputLangEn: "English",
    kpis: "مؤشرات الأداء (KPIs) — اختياري",
    kpisPh: "اكتب الـ KPIs لو موجودة. لو سيبتها فاضية مش هيظهر جدول KPIs.",
    reportsSection: "التقارير (Reports) *",
    reportsHint: "أضف التقارير التي تنتجها/تقدمها الوظيفة. لو مفيش، اكتب N/A في خانة الاسم.",
    reportName: "اسم التقرير",
    reportFreq: "التكرار",
    reportPurpose: "الغرض",
    reportPresentedTo: "مقدم إلى",
    addReport: "+ إضافة تقرير",
    pdSection: "أبعاد الوظيفة (Position Dimensions) *",
    pdHint: "لو مفيش معلومة، اكتب N/A.",
    pdAuthority: "Level of Authority",
    pdFinControl: "Financial Control",
    pdAnnualAmount: "Annual Amount",
    pdHiring: "Hiring & Promotion Authority",
    submit: "ابدأ التحليل الذكي",
    submitting: "جاري الإرسال...",
    received: "تم استلام البيانات، جاري التحليل...",
    errSend: "حصلت مشكلة في إرسال البيانات، حاول تاني",
    errRequired: "من فضلك املأ كل الحقول الإجبارية",
  },
  en: {
    backHome: "Back to Home",
    pastRequests: "Past Requests",
    badge: "Smart Job Analysis",
    title: "Job Information",
    subtitle: "Fill the required fields. Optional fields can be skipped.",
    info: "All fields are required except those marked (optional).",
    sector: "Sector *",
    sectorPh: "Select sector",
    department: "Department *",
    departmentPh: "Select department",
    position: "Position Title *",
    positionPh: "Select position",
    newPosition: "+ New Position",
    newPositionTitle: "New Position Title *",
    newPositionTitlePh: "e.g. Senior Data Analyst",
    approvedBy: "Approved By *",
    approvedByPh: "Name of person approving the new position",
    location: "Location *",
    locationPh: "Select location",
    reportsTo: "Reporting to (Direct Manager) *",
    reportsToPh: "e.g. CEO / Sales Director",
    directReports: "Direct Subordinates (optional)",
    directReportsPh: "One per line",
    purpose: "Main Job Purpose *",
    purposePh: "Main purpose of this role",
    tasks: "Tasks & Responsibilities *",
    tasksPh: "Describe tasks. AI will split them into Responsibilities and KRAs.",
    qualifications: "Qualifications, Experience & Skills *",
    qualificationsPh: "Education, Experience, Computer Skills, Languages...",
    workCond: "Working Conditions + Internal & External Communication *",
    workCondPh: "Hours, location, internal departments, external parties...",
    notes: "Additional Notes — optional",
    notesPh: "Any other important info (optional)",
    collar: "Job Collar Type *",
    collarPh: "Select collar type",
    blueCollar: "Blue Collar",
    whiteCollar: "White Collar",
    outputLang: "JD Output Language *",
    outputLangPh: "Select language",
    outputLangAr: "Arabic",
    outputLangEn: "English",
    kpis: "Key Performance Indicators (KPIs) — optional",
    kpisPh: "List KPIs if any. If empty, the KPIs table will not appear.",
    reportsSection: "Reports *",
    reportsHint: "Add the reports this role produces/presents. If none, type N/A in the Name field.",
    reportName: "Report Name",
    reportFreq: "Frequency",
    reportPurpose: "Purpose",
    reportPresentedTo: "Presented To",
    addReport: "+ Add Report",
    pdSection: "Position Dimensions *",
    pdHint: "If not applicable, type N/A.",
    pdAuthority: "Level of Authority",
    pdFinControl: "Financial Control",
    pdAnnualAmount: "Annual Amount",
    pdHiring: "Hiring & Promotion Authority",
    submit: "Start Smart Analysis",
    submitting: "Submitting...",
    received: "Data received, analyzing...",
    errSend: "Something went wrong, try again",
    errRequired: "Please fill all required fields",
  },
} as const;

const LOCATIONS = ["Borg", "Fagala", "October"];

interface ReportRow { name: string; frequency: string; purpose: string; presented_to: string }

function SubmitPage() {
  const navigate = useNavigate();
  const prefill = Route.useSearch();
  const { isAllowed } = useScopes();
  const [submitting, setSubmitting] = useState(false);
  const [lang, setLang] = useState<Lang>("ar");
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [sector, setSector] = useState(prefill.sector || "");
  const [department, setDepartment] = useState(prefill.department || "");
  const [position, setPosition] = useState(prefill.position || "");
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [collar, setCollar] = useState<"white" | "blue" | "">("");
  const [outputLang, setOutputLang] = useState<"ar" | "en" | "">("");

  const sectors = useMemo(
    () => Object.keys(POSITIONS).filter(s => isAllowed(s)).sort(),
    [isAllowed]
  );
  const departments = useMemo(
    () => (sector && POSITIONS[sector]
      ? Object.keys(POSITIONS[sector])
          .filter(d => d && d !== "-")
          .filter(d => isAllowed(sector, d))
          .sort()
      : []),
    [sector, isAllowed]
  );
  const positionsList = useMemo(
    () => (sector && department && POSITIONS[sector]?.[department]) ? POSITIONS[sector][department] : [],
    [sector, department]
  );
  const isNewPosition = position === NEW_POSITION;

  // Upload + AI parse
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);

  const [form, setForm] = useState({

    location: "",
    purpose: "",
    tasksAndResponsibilities: "",
    qualifications: "",
    workingConditions: "",
    reportsTo: "",
    directReports: "",
    kpis: "",
    notes: "",
    pd_authority: "",
    pd_financial: "",
    pd_annual: "",
    pd_hiring: "",
  });
  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [reports, setReports] = useState<ReportRow[]>([
    { name: "", frequency: "", purpose: "", presented_to: "" },
  ]);
  const addReport = () => setReports([...reports, { name: "", frequency: "", purpose: "", presented_to: "" }]);
  const removeReport = (i: number) => setReports(reports.filter((_, idx) => idx !== i));
  const updateReport = (i: number, k: keyof ReportRow, v: string) =>
    setReports(reports.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const extractFileText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    // Excel
    if (/\.(xlsx|xls|xlsm|csv)$/.test(name)) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parts: string[] = [];
      for (const sheet of wb.SheetNames) {
        parts.push(`### Sheet: ${sheet}`);
        parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[sheet]));
      }
      return parts.join("\n");
    }
    // Word
    if (/\.docx$/.test(name)) {
      const mammoth = await import("mammoth");
      const buf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: buf });
      return res.value || "";
    }
    // PDF
    if (/\.pdf$/.test(name)) {
      const pdfjs = await import("pdfjs-dist");
      // Use bundled worker
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const parts: string[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        // deno-lint-ignore no-explicit-any
        parts.push(tc.items.map((it: any) => it.str).join(" "));
      }
      return parts.join("\n");
    }
    // Plain text
    if (file.type.startsWith("text/") || /\.(txt|md|json)$/.test(name)) {
      return await file.text();
    }
    throw new Error("نوع الملف غير مدعوم");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("الملف أكبر من 15MB"); return; }
    setParsing(true);
    try {
      const text = await extractFileText(file);
      if (text.trim().length < 20) { toast.error("الملف فاضي أو غير مدعوم"); return; }

      const { data, error } = await supabase.functions.invoke("parse-job-doc", { body: { text } });
      if (error || (data as { error?: string })?.error) {
        toast.error("فشل قراءة الملف بالـ AI"); return;
      }
      const d = (data as { data: Record<string, string> }).data || {};
      const title = String(d.job_title || "").trim();
      if (title && !position) {
        let matched = false;
        outer: for (const [sec, depts] of Object.entries(POSITIONS)) {
          for (const [dep, list] of Object.entries(depts)) {
            if (list.some(p => p.toLowerCase() === title.toLowerCase())) {
              setSector(sec);
              setDepartment(dep === "-" ? "" : dep);
              setPosition(title);
              matched = true;
              break outer;
            }
          }
        }
        if (!matched) {
          setPosition(NEW_POSITION);
          setNewPositionTitle(title);
        }
      }

      setForm(f => ({
        ...f,
        location: d.location || f.location,
        purpose: d.purpose || f.purpose,
        tasksAndResponsibilities: d.tasks || f.tasksAndResponsibilities,
        qualifications: d.qualifications || f.qualifications,
        workingConditions: d.workingConditions || f.workingConditions,
        reportsTo: d.reportsTo || f.reportsTo,
        directReports: d.directReports || f.directReports,
        kpis: d.kpis || f.kpis,
        notes: d.notes || f.notes,
        pd_authority: d.pd_authority || f.pd_authority || "N/A",
        pd_financial: d.pd_financial || f.pd_financial || "N/A",
        pd_annual: d.pd_annual || f.pd_annual || "N/A",
        pd_hiring: d.pd_hiring || f.pd_hiring || "N/A",
      }));
      const parsedReports = (data as { data: { reports?: ReportRow[] } }).data?.reports;
      if (parsedReports && parsedReports.length > 0) {
        setReports(parsedReports.map(r => ({
          name: r.name || "",
          frequency: r.frequency || "",
          purpose: r.purpose || "",
          presented_to: r.presented_to || "",
        })));
      }
      toast.success("تم استخراج البيانات — راجعها قبل الإرسال");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "حصلت مشكلة أثناء قراءة الملف");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = isNewPosition ? newPositionTitle.trim() : position;
    const required = [
      sector, department, finalTitle, collar, outputLang,
      form.location, form.reportsTo, form.purpose, form.tasksAndResponsibilities,
      form.qualifications, form.workingConditions,
      form.pd_authority, form.pd_financial, form.pd_annual, form.pd_hiring,
    ];
    if (required.some(v => !v.trim()) || (isNewPosition && !approvedBy.trim())) {
      toast.error(t.errRequired);
      return;
    }
    if (!reports.some(r => r.name.trim())) {
      toast.error(t.errRequired);
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      const { data: insertData, error: insertErr } = await supabase
        .from("job_analyses")
        .insert([{
          job_title: finalTitle,
          department: department || null,
          manager_name: null,
          user_id: userId,
          raw_input: {
            sector,
            department,
            position_source: isNewPosition ? "new" : "existing",
            approved_by: isNewPosition ? approvedBy : "",
            collar,
            output_language: outputLang || (collar === "blue" ? "ar" : "en"),
            location: form.location,
            purpose: form.purpose,
            tasks: form.tasksAndResponsibilities,
            responsibilities: form.tasksAndResponsibilities,
            qualifications: form.qualifications,
            workingConditions: form.workingConditions,
            reportsTo: form.reportsTo,
            directReports: form.directReports,
            kpis: form.kpis,
            notes: form.notes,
            position_dimensions_input: {
              level_of_authority: form.pd_authority,
              financial_control: form.pd_financial,
              annual_amount: form.pd_annual,
              hiring_promotion_authority: form.pd_hiring,
            },
            reports_input: reports.filter(r => r.name.trim()).map(r => ({ ...r })),
          } as never,
          status: "processing",
        }])
        .select()
        .single();

      if (insertErr || !insertData) throw insertErr || new Error("Insert failed");
      toast.success(t.received);
      supabase.functions.invoke("analyze-job", { body: { analysisId: insertData.id } }).catch(console.error);
      navigate({ to: "/result/$id", params: { id: insertData.id } });
    } catch (err) {
      console.error(err);
      toast.error(t.errSend);
      setSubmitting(false);
    }
  };

  const BackArrow = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen py-8 md:py-12" dir={dir}>
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <BackArrow className="w-4 h-4" />
            {t.backHome}
          </Link>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="gap-1.5">
              <Languages className="w-4 h-4" />
              {lang === "ar" ? "English" : "العربية"}
            </Button>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
              {t.pastRequests}
            </Link>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {t.badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2 text-sm">
              <Wand2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">ارفع ملف وخلي الـ AI يملأ الفورم بدالك</div>
                <p className="text-xs text-muted-foreground">يدعم Excel (.xlsx/.xls/.csv) و Word (.docx) و PDF و نصوص (.txt/.md). راجع البيانات قبل الإرسال.</p>
              </div>
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json,.docx,.pdf,.xlsx,.xls,.xlsm" onChange={handleFile} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={parsing} className="gap-1.5">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {parsing ? "جاري التحليل..." : "رفع ملف"}
              </Button>
            </div>
          </div>
        </Card>


        <Card className="p-3 mb-6 bg-accent/10 border-accent/30">
          <div className="flex gap-2 text-sm">
            <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <p className="text-accent-foreground/90">{t.info}</p>
          </div>
        </Card>

        <Card className="bg-gradient-card p-6 md:p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.collar} required>
                <Select value={collar} onValueChange={(v) => setCollar(v as "white" | "blue")}>
                  <SelectTrigger><SelectValue placeholder={t.collarPh} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">{t.whiteCollar}</SelectItem>
                    <SelectItem value="blue">{t.blueCollar}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.outputLang} required>
                <Select value={outputLang} onValueChange={(v) => setOutputLang(v as "ar" | "en")}>
                  <SelectTrigger><SelectValue placeholder={t.outputLangPh} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t.outputLangEn}</SelectItem>
                    <SelectItem value="ar">{t.outputLangAr}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>


            {/* Sector / Department / Position cascading */}
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.sector} required>
                <Select value={sector} onValueChange={(v) => { setSector(v); setDepartment(""); setPosition(""); }}>
                  <SelectTrigger><SelectValue placeholder={t.sectorPh} /></SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.department} required>
                <Select value={department} onValueChange={(v) => { setDepartment(v); setPosition(""); }} disabled={!sector}>
                  <SelectTrigger><SelectValue placeholder={t.departmentPh} /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={t.position} required>
              <Select value={position} onValueChange={setPosition} disabled={!department}>
                <SelectTrigger><SelectValue placeholder={t.positionPh} /></SelectTrigger>
                <SelectContent>
                  {positionsList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value={NEW_POSITION} className="font-semibold text-primary">
                    {t.newPosition}
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {isNewPosition && (
              <div className="grid md:grid-cols-2 gap-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
                <Field label={t.newPositionTitle} required>
                  <Input value={newPositionTitle} onChange={(e) => setNewPositionTitle(e.target.value)} placeholder={t.newPositionTitlePh} maxLength={150} />
                </Field>
                <Field label={t.approvedBy} required>
                  <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder={t.approvedByPh} maxLength={150} />
                </Field>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.location} required>
                <Select value={form.location} onValueChange={(v) => update("location", v)}>
                  <SelectTrigger><SelectValue placeholder={t.locationPh} /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t.reportsTo} required>
                <Input value={form.reportsTo} onChange={(e) => update("reportsTo", e.target.value)} placeholder={t.reportsToPh} maxLength={150} />
              </Field>
            </div>

            <Field label={t.directReports}>
              <Textarea value={form.directReports} onChange={(e) => update("directReports", e.target.value)} placeholder={t.directReportsPh} rows={3} maxLength={2000} />
            </Field>

            <div className="border-t border-border/60 pt-5 space-y-5">
              <Field label={t.purpose} required>
                <Textarea value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder={t.purposePh} rows={2} maxLength={1000} />
              </Field>

              <Field label={t.tasks} required>
                <Textarea value={form.tasksAndResponsibilities} onChange={(e) => update("tasksAndResponsibilities", e.target.value)} placeholder={t.tasksPh} rows={5} maxLength={3000} />
              </Field>

              <Field label={t.qualifications} required>
                <Textarea value={form.qualifications} onChange={(e) => update("qualifications", e.target.value)} placeholder={t.qualificationsPh} rows={5} maxLength={2000} />
              </Field>

              <Field label={t.workCond} required>
                <Textarea value={form.workingConditions} onChange={(e) => update("workingConditions", e.target.value)} placeholder={t.workCondPh} rows={4} maxLength={1500} />
              </Field>

              {/* Reports */}
              <div className="space-y-2">
                <Label className="font-semibold">{t.reportsSection}</Label>
                <p className="text-xs text-muted-foreground">{t.reportsHint}</p>
                <div className="space-y-3">
                  {reports.map((r, i) => (
                    <div key={i} className="grid md:grid-cols-12 gap-2 items-start p-3 rounded-md border border-border/60 bg-background/50">
                      <Input className="md:col-span-3" value={r.name} onChange={(e) => updateReport(i, "name", e.target.value)} placeholder={t.reportName} />
                      <Input className="md:col-span-2" value={r.frequency} onChange={(e) => updateReport(i, "frequency", e.target.value)} placeholder={t.reportFreq} />
                      <Input className="md:col-span-4" value={r.purpose} onChange={(e) => updateReport(i, "purpose", e.target.value)} placeholder={t.reportPurpose} />
                      <Input className="md:col-span-2" value={r.presented_to} onChange={(e) => updateReport(i, "presented_to", e.target.value)} placeholder={t.reportPresentedTo} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeReport(i)} disabled={reports.length === 1} className="md:col-span-1">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addReport} className="gap-1">
                  <Plus className="w-4 h-4" /> {t.addReport}
                </Button>
              </div>

              {/* Position Dimensions */}
              <div className="space-y-3">
                <Label className="font-semibold">{t.pdSection}</Label>
                <p className="text-xs text-muted-foreground">{t.pdHint}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t.pdAuthority} required>
                    <Textarea value={form.pd_authority} onChange={(e) => update("pd_authority", e.target.value)} rows={2} maxLength={500} placeholder="N/A" />
                  </Field>
                  <Field label={t.pdFinControl} required>
                    <Textarea value={form.pd_financial} onChange={(e) => update("pd_financial", e.target.value)} rows={2} maxLength={500} placeholder="N/A" />
                  </Field>
                  <Field label={t.pdAnnualAmount} required>
                    <Textarea value={form.pd_annual} onChange={(e) => update("pd_annual", e.target.value)} rows={2} maxLength={500} placeholder="N/A" />
                  </Field>
                  <Field label={t.pdHiring} required>
                    <Textarea value={form.pd_hiring} onChange={(e) => update("pd_hiring", e.target.value)} rows={2} maxLength={500} placeholder="N/A" />
                  </Field>
                </div>
              </div>

              <Field label={t.kpis}>
                <Textarea value={form.kpis} onChange={(e) => update("kpis", e.target.value)} placeholder={t.kpisPh} rows={3} maxLength={1500} />
              </Field>

              <Field label={t.notes}>
                <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder={t.notesPh} rows={2} maxLength={1000} />
              </Field>
            </div>

            <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-hero text-primary-foreground hover:opacity-95 shadow-elevated">
              {submitting ? (
                <><Loader2 className="w-5 h-5 mx-2 animate-spin" />{t.submitting}</>
              ) : (
                <><Sparkles className="w-5 h-5 mx-2" />{t.submit}</>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className={required ? "font-semibold" : ""}>{label}</Label>
      {children}
    </div>
  );
}

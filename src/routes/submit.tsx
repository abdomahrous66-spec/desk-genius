import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Info, Languages } from "lucide-react";

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

type Lang = "ar" | "en";

const T = {
  ar: {
    backHome: "الرجوع للرئيسية",
    pastRequests: "الطلبات السابقة",
    badge: "تحليل وظيفي ذكي",
    title: "بيانات الوظيفة",
    subtitle: "املأ ما تعرفه عن الوظيفة. الحقول الفاضية هيكملها الذكاء الاصطناعي بناءً على خبرته.",
    info: "**المسمى الوظيفي** هو الحقل الإجباري الوحيد. باقي الحقول اختيارية.",
    jobTitle: "المسمى الوظيفي *",
    jobTitlePh: "مثال: مهندس برمجيات أول",
    sector: "القطاع (Sector)",
    sectorPh: "مثال: تكنولوجيا المعلومات / صناعي / مالي",
    department: "القسم / الإدارة",
    departmentPh: "مثال: تطوير البرمجيات",
    manager: "اسم المدير المسؤول",
    managerPh: "اسمك",
    reportsTo: "المنصب المباشر التابع له",
    reportsToPh: "مثال: مدير قسم التطوير",
    structure: "هيكل التبعية (Position Reporting Line / Structure)",
    structurePh: "اكتب الهيكل الوظيفي يدوياً، مثال: CEO → CTO → Engineering Manager → هذه الوظيفة → Junior Devs",
    purpose: "الهدف من الوظيفة",
    purposePh: "إيه الهدف الأساسي من الوظيفة دي؟ (اختياري)",
    tasks: "المهام والمسؤوليات",
    tasksPh: "اكتب المهام والمسؤوليات اللي بيعملها صاحب الوظيفة. الـ AI هيقسمها لـ Responsibilities و KRAs.",
    qualifications: "المؤهلات والخبرات والمهارات (Education, Experience, Computer & Language Skills)",
    qualificationsPh: "اكتب كل حاجة مع بعض: المؤهل العلمي، سنوات الخبرة، مهارات الكمبيوتر، اللغات...",
    kpis: "مؤشرات الأداء (KPIs) — اختياري",
    kpisPh: "اكتب الـ KPIs لو موجودة. لو سيبتها فاضية مش هيظهر جدول KPIs في الملف. مثال: زمن الاستجابة، نسبة رضا العملاء، عدد المشاريع المسلمة...",
    workCond: "ظروف العمل + Internal & External Communication",
    workCondPh: "ساعات عمل، مكان، سفر، ضغط، الجهات الداخلية اللي بيتعامل معاها (أقسام)، والجهات الخارجية (عملاء، موردين، جهات حكومية)...",
    notes: "ملاحظات إضافية",
    notesPh: "أي معلومات تانية مهمة",
    submit: "ابدأ التحليل الذكي",
    submitting: "جاري الإرسال...",
    errEmpty: "من فضلك أدخل المسمى الوظيفي على الأقل",
    received: "تم استلام البيانات، جاري التحليل...",
    errSend: "حصلت مشكلة في إرسال البيانات، حاول تاني",
  },
  en: {
    backHome: "Back to Home",
    pastRequests: "Past Requests",
    badge: "Smart Job Analysis",
    title: "Job Information",
    subtitle: "Fill what you know about the job. AI will fill the gaps based on its expertise.",
    info: "**Job Title** is the only required field. All others are optional.",
    jobTitle: "Job Title *",
    jobTitlePh: "e.g. Senior Software Engineer",
    sector: "Sector",
    sectorPh: "e.g. Information Technology / Industrial / Financial",
    department: "Department",
    departmentPh: "e.g. Software Development",
    manager: "Manager Name",
    managerPh: "Your name",
    reportsTo: "Direct Reporting Position",
    reportsToPh: "e.g. Engineering Manager",
    structure: "Position Reporting Line (Structure)",
    structurePh: "Write the structure manually, e.g.: CEO → CTO → Engineering Manager → This Role → Junior Devs",
    purpose: "Job Purpose",
    purposePh: "What's the main purpose of this role? (optional)",
    tasks: "Tasks & Responsibilities",
    tasksPh: "Describe the tasks and responsibilities. AI will split them into Responsibilities and KRAs.",
    qualifications: "Qualifications, Experience & Skills (Education, Experience, Computer & Language Skills)",
    qualificationsPh: "Write all together: education, years of experience, computer skills, languages...",
    kpis: "Key Performance Indicators (KPIs) — optional",
    kpisPh: "List KPIs if any. If left empty, the KPIs table will not appear in the Word file. e.g.: response time, customer satisfaction, projects delivered...",
    workCond: "Working Conditions + Internal & External Communication",
    workCondPh: "Working hours, location, travel, pressure, internal stakeholders (departments), external parties (clients, suppliers, government)...",
    notes: "Additional Notes",
    notesPh: "Any other important info",
    submit: "Start Smart Analysis",
    submitting: "Submitting...",
    errEmpty: "Please enter at least the Job Title",
    received: "Data received, analyzing...",
    errSend: "Something went wrong, try again",
  },
} as const;

function SubmitPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [lang, setLang] = useState<Lang>("ar");
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [form, setForm] = useState({
    job_title: "",
    sector: "",
    department: "",
    manager_name: "",
    purpose: "",
    tasksAndResponsibilities: "",
    qualifications: "",
    workingConditions: "",
    reportsTo: "",
    structure: "",
    kpis: "",
    notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.job_title.trim()) {
      toast.error(t.errEmpty);
      return;
    }
    setSubmitting(true);
    try {
      const { data: insertData, error: insertErr } = await supabase
        .from("job_analyses")
        .insert({
          job_title: form.job_title.trim(),
          department: form.department.trim() || null,
          manager_name: form.manager_name.trim() || null,
          raw_input: {
            sector: form.sector,
            purpose: form.purpose,
            tasks: form.tasksAndResponsibilities,
            responsibilities: form.tasksAndResponsibilities,
            skills: "",
            qualifications: form.qualifications,
            workingConditions: form.workingConditions,
            reportsTo: form.reportsTo,
            structure: form.structure,
            kpis: form.kpis,
            notes: form.notes,
          },
          status: "processing",
        })
        .select()
        .single();

      if (insertErr || !insertData) throw insertErr || new Error("Insert failed");

      toast.success(t.received);

      supabase.functions.invoke("analyze-job", { body: { analysisId: insertData.id } }).catch((err) => {
        console.error("Analyze invocation error:", err);
      });

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="gap-1.5"
            >
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

        <Card className="p-3 mb-6 bg-accent/10 border-accent/30">
          <div className="flex gap-2 text-sm">
            <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <p
              className="text-accent-foreground/90"
              dangerouslySetInnerHTML={{ __html: t.info.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
            />
          </div>
        </Card>

        <Card className="bg-gradient-card p-6 md:p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.jobTitle} required>
                <Input
                  value={form.job_title}
                  onChange={(e) => update("job_title", e.target.value)}
                  placeholder={t.jobTitlePh}
                  maxLength={150}
                />
              </Field>
              <Field label={t.sector}>
                <Input
                  value={form.sector}
                  onChange={(e) => update("sector", e.target.value)}
                  placeholder={t.sectorPh}
                  maxLength={100}
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label={t.department}>
                <Input
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder={t.departmentPh}
                  maxLength={100}
                />
              </Field>
              <Field label={t.manager}>
                <Input
                  value={form.manager_name}
                  onChange={(e) => update("manager_name", e.target.value)}
                  placeholder={t.managerPh}
                  maxLength={100}
                />
              </Field>
            </div>

            <Field label={t.reportsTo}>
              <Input
                value={form.reportsTo}
                onChange={(e) => update("reportsTo", e.target.value)}
                placeholder={t.reportsToPh}
                maxLength={100}
              />
            </Field>

            <Field label={t.structure}>
              <Textarea
                value={form.structure}
                onChange={(e) => update("structure", e.target.value)}
                placeholder={t.structurePh}
                rows={3}
                maxLength={1500}
              />
            </Field>

            <div className="border-t border-border/60 pt-5 space-y-5">
              <Field label={t.purpose}>
                <Textarea
                  value={form.purpose}
                  onChange={(e) => update("purpose", e.target.value)}
                  placeholder={t.purposePh}
                  rows={2}
                  maxLength={1000}
                />
              </Field>

              <Field label={t.tasks}>
                <Textarea
                  value={form.tasksAndResponsibilities}
                  onChange={(e) => update("tasksAndResponsibilities", e.target.value)}
                  placeholder={t.tasksPh}
                  rows={5}
                  maxLength={3000}
                />
              </Field>

              <Field label={t.qualifications}>
                <Textarea
                  value={form.qualifications}
                  onChange={(e) => update("qualifications", e.target.value)}
                  placeholder={t.qualificationsPh}
                  rows={5}
                  maxLength={2000}
                />
              </Field>

              <Field label={t.kpis}>
                <Textarea
                  value={form.kpis}
                  onChange={(e) => update("kpis", e.target.value)}
                  placeholder={t.kpisPh}
                  rows={3}
                  maxLength={1500}
                />
              </Field>

              <Field label={t.workCond}>
                <Textarea
                  value={form.workingConditions}
                  onChange={(e) => update("workingConditions", e.target.value)}
                  placeholder={t.workCondPh}
                  rows={4}
                  maxLength={1500}
                />
              </Field>

              <Field label={t.notes}>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder={t.notesPh}
                  rows={2}
                  maxLength={1000}
                />
              </Field>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full bg-gradient-hero text-primary-foreground hover:opacity-95 shadow-elevated"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mx-2 animate-spin" />
                  {t.submitting}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mx-2" />
                  {t.submit}
                </>
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

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Loader2, Info } from "lucide-react";

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

function SubmitPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    job_title: "",
    department: "",
    manager_name: "",
    purpose: "",
    tasksAndResponsibilities: "",
    qualifications: "",
    workingConditions: "",
    reportsTo: "",
    kpis: "",
    notes: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.job_title.trim()) {
      toast.error("من فضلك أدخل المسمى الوظيفي على الأقل");
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
            purpose: form.purpose,
            tasks: form.tasks,
            responsibilities: form.responsibilities,
            skills: form.skills,
            qualifications: form.qualifications,
            workingConditions: form.workingConditions,
            reportsTo: form.reportsTo,
            kpis: form.kpis,
            notes: form.notes,
          },
          status: "processing",
        })
        .select()
        .single();

      if (insertErr || !insertData) throw insertErr || new Error("Insert failed");

      toast.success("تم استلام البيانات، جاري التحليل...");

      // Trigger AI analysis (don't await — navigate immediately and poll on result page)
      supabase.functions.invoke("analyze-job", { body: { analysisId: insertData.id } }).catch((err) => {
        console.error("Analyze invocation error:", err);
      });

      navigate({ to: "/result/$id", params: { id: insertData.id } });
    } catch (err) {
      console.error(err);
      toast.error("حصلت مشكلة في إرسال البيانات، حاول تاني");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            الرجوع للرئيسية
          </Link>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
            الطلبات السابقة
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            تحليل وظيفي ذكي
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">بيانات الوظيفة</h1>
          <p className="text-muted-foreground">
            املأ ما تعرفه عن الوظيفة. الحقول الفاضية هيكملها الذكاء الاصطناعي بناءً على خبرته.
          </p>
        </div>

        <Card className="p-3 mb-6 bg-accent/10 border-accent/30">
          <div className="flex gap-2 text-sm">
            <Info className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <p className="text-accent-foreground/90">
              <strong>المسمى الوظيفي</strong> هو الحقل الإجباري الوحيد. باقي الحقول اختيارية.
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-card p-6 md:p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="المسمى الوظيفي *" required>
                <Input
                  value={form.job_title}
                  onChange={(e) => update("job_title", e.target.value)}
                  placeholder="مثال: مهندس برمجيات أول"
                  maxLength={150}
                />
              </Field>
              <Field label="القسم / الإدارة">
                <Input
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  placeholder="مثال: تكنولوجيا المعلومات"
                  maxLength={100}
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="اسم المدير المسؤول">
                <Input
                  value={form.manager_name}
                  onChange={(e) => update("manager_name", e.target.value)}
                  placeholder="اسمك"
                  maxLength={100}
                />
              </Field>
              <Field label="المنصب المباشر التابع له">
                <Input
                  value={form.reportsTo}
                  onChange={(e) => update("reportsTo", e.target.value)}
                  placeholder="مثال: مدير قسم التطوير"
                  maxLength={100}
                />
              </Field>
            </div>

            <div className="border-t border-border/60 pt-5 space-y-5">
              <Field label="الهدف من الوظيفة">
                <Textarea
                  value={form.purpose}
                  onChange={(e) => update("purpose", e.target.value)}
                  placeholder="إيه الهدف الأساسي من الوظيفة دي؟ (اختياري)"
                  rows={2}
                  maxLength={1000}
                />
              </Field>

              <Field label="المهام والأنشطة الأساسية">
                <Textarea
                  value={form.tasks}
                  onChange={(e) => update("tasks", e.target.value)}
                  placeholder="اكتب المهام اللي بيعملها صاحب الوظيفة (لو فاكر بعضها بس، اكتبهم)"
                  rows={4}
                  maxLength={2000}
                />
              </Field>

              <Field label="المسؤوليات">
                <Textarea
                  value={form.responsibilities}
                  onChange={(e) => update("responsibilities", e.target.value)}
                  placeholder="إيه المسؤوليات الموكلة للوظيفة؟"
                  rows={3}
                  maxLength={2000}
                />
              </Field>

              <Field label="المهارات المطلوبة">
                <Textarea
                  value={form.skills}
                  onChange={(e) => update("skills", e.target.value)}
                  placeholder="مهارات تقنية، شخصية، لغات، برامج..."
                  rows={3}
                  maxLength={1500}
                />
              </Field>

              <Field label="المؤهلات والخبرات المطلوبة">
                <Textarea
                  value={form.qualifications}
                  onChange={(e) => update("qualifications", e.target.value)}
                  placeholder="الشهادات، سنوات الخبرة، التخصص..."
                  rows={2}
                  maxLength={1000}
                />
              </Field>

              <Field label="مؤشرات الأداء (KPIs)">
                <Textarea
                  value={form.kpis}
                  onChange={(e) => update("kpis", e.target.value)}
                  placeholder="إزاي بنقيس نجاح صاحب الوظيفة؟"
                  rows={2}
                  maxLength={1000}
                />
              </Field>

              <Field label="ظروف العمل">
                <Textarea
                  value={form.workingConditions}
                  onChange={(e) => update("workingConditions", e.target.value)}
                  placeholder="ساعات عمل، مكان، سفر، ضغط..."
                  rows={2}
                  maxLength={500}
                />
              </Field>

              <Field label="ملاحظات إضافية">
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="أي معلومات تانية مهمة"
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
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 ml-2" />
                  ابدأ التحليل الذكي
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

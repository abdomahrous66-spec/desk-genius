import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight, Copy, Download, FileText, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { generateJDDocx, type JDData } from "@/lib/generate-jd-docx";

export const Route = createFileRoute("/result/$id")({
  component: ResultPage,
});

type AnalysisRecord = {
  id: string;
  job_title: string;
  department: string | null;
  manager_name: string | null;
  status: string;
  analysis_result: string | null;
  jd_data: JDData | null;
  created_at: string;
};

function ResultPage() {
  const { id } = Route.useParams();
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchRecord = async () => {
      const { data, error } = await supabase
        .from("job_analyses")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error(error);
        toast.error("تعذّر تحميل النتيجة");
        setLoading(false);
        return;
      }
      setRecord(data as AnalysisRecord | null);
      setLoading(false);

      if (data && (data.status === "completed" || data.status === "error") && timer) {
        clearInterval(timer);
      }
    };

    fetchRecord();
    timer = setInterval(fetchRecord, 3000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const copy = () => {
    if (!record?.analysis_result) return;
    navigator.clipboard.writeText(record.analysis_result);
    toast.success("تم نسخ التحليل");
  };

  const download = () => {
    if (!record?.analysis_result) return;
    const blob = new Blob([record.analysis_result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-analysis-${record.job_title.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJD = async () => {
    if (!record?.jd_data) {
      toast.error("بيانات الـ Job Description لسه مش جاهزة");
      return;
    }
    try {
      await generateJDDocx(record.jd_data);
      toast.success("تم تحميل ملف الـ Job Description");
    } catch (e) {
      console.error(e);
      toast.error("حصلت مشكلة في توليد الملف");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-bold mb-2">لم يتم العثور على الطلب</h2>
          <Link to="/">
            <Button>الرجوع للرئيسية</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isProcessing = record.status === "processing" || record.status === "pending";
  const isError = record.status === "error";

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </Link>
        </div>

        <Card className="bg-gradient-card p-6 md:p-8 shadow-elevated mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{record.job_title}</h1>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {record.department && <p>القسم: {record.department}</p>}
                {record.manager_name && <p>المدير: {record.manager_name}</p>}
              </div>
            </div>
            <StatusBadge status={record.status} />
          </div>
        </Card>

        {isProcessing && (
          <Card className="bg-gradient-card p-12 text-center shadow-soft">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-2">الذكاء الاصطناعي بيحلل البيانات...</h2>
            <p className="text-muted-foreground mb-6">عادة بياخد من 10 لـ 30 ثانية. الصفحة هتتحدث تلقائياً.</p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </Card>
        )}

        {isError && (
          <Card className="bg-destructive/5 border-destructive/30 p-6 shadow-soft">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-destructive mb-1">حصلت مشكلة في التحليل</h3>
                <p className="text-sm text-muted-foreground">{record.analysis_result || "حاول تاني بعد شوية"}</p>
              </div>
            </div>
          </Card>
        )}

        {record.status === "completed" && record.analysis_result && (
          <>
            <div className="flex flex-wrap gap-2 mb-4 justify-end">
              <Button onClick={copy} variant="outline" size="sm">
                <Copy className="w-4 h-4 ml-1.5" />
                نسخ التحليل
              </Button>
              <Button onClick={download} variant="outline" size="sm">
                <Download className="w-4 h-4 ml-1.5" />
                تحميل التحليل (MD)
              </Button>
              <Button onClick={downloadJD} size="sm" className="bg-primary text-primary-foreground" disabled={!record.jd_data}>
                <FileText className="w-4 h-4 ml-1.5" />
                تحميل Job Description (Word)
              </Button>
            </div>

            <Card className="bg-card p-6 md:p-10 shadow-elevated">
              <article className="ltr-content prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-primary prose-p:leading-relaxed prose-li:my-1">
                <MarkdownRenderer text={record.analysis_result} />
              </article>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "في الانتظار", cls: "bg-muted text-muted-foreground" },
    processing: { label: "جاري التحليل", cls: "bg-primary/10 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/10 text-success" },
    error: { label: "خطأ", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

// Minimal markdown renderer (headings, bold, lists, paragraphs) — no extra deps
function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={key++}>
          {listBuf.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />
          ))}
        </ul>
      );
      listBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#\s+/.test(line)) {
      flushList();
      blocks.push(<h1 key={key++} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^#\s+/, "")) }} />);
    } else if (/^##\s+/.test(line)) {
      flushList();
      blocks.push(<h2 key={key++} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^##\s+/, "")) }} />);
    } else if (/^###\s+/.test(line)) {
      flushList();
      blocks.push(<h3 key={key++} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^###\s+/, "")) }} />);
    } else if (/^\s*[-*]\s+/.test(line)) {
      listBuf.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (/^\s*\d+\.\s+/.test(line)) {
      listBuf.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  }
  flushList();
  return <>{blocks}</>;
}

function inline(s: string): string {
  // escape then apply bold/italic
  const esc = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Loader2, FileText, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { useLang, useT } from "@/hooks/use-i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/dashboard")({
  component: () => (<RequireAuth requireCap="viewJD"><Dashboard /></RequireAuth>),
});

type Row = {
  id: string;
  job_title: string;
  department: string | null;
  manager_name: string | null;
  status: string;
  created_at: string;
};

function Dashboard() {
  const auth = useAuth();
  const { dir, lang } = useLang();
  const t = useT({
    en: {
      home: "Home",
      newAnalysis: "New Analysis",
      pastRequests: "Past Requests",
      pastRequestsDesc: "All job analyses that have been created — you can delete the ones you no longer need",
      noRequestsTitle: "No requests yet",
      noRequestsDesc: "Start your first job analysis now",
      startAnalysis: "Start Analysis",
      deleteFailed: "Failed to delete, please try again",
      deleted: "Deleted successfully",
      confirmDeleteTitle: "Confirm Deletion",
      confirmDeleteDesc: (title: string) => `This will permanently delete the job analysis "${title}". This action cannot be undone.`,
      cancel: "Cancel",
      delete: "Delete",
      statusPending: "Pending",
      statusProcessing: "Processing",
      statusCompleted: "Completed",
      statusError: "Error",
    },
    ar: {
      home: "الرئيسية",
      newAnalysis: "تحليل جديد",
      pastRequests: "الطلبات السابقة",
      pastRequestsDesc: "كل تحليلات الوظائف اللي اتعملت — تقدر تحذف اللي مش محتاجه",
      noRequestsTitle: "مفيش طلبات لسة",
      noRequestsDesc: "ابدأ أول تحليل وظيفة دلوقتي",
      startAnalysis: "ابدأ تحليل",
      deleteFailed: "فشل الحذف، حاول تاني",
      deleted: "تم الحذف",
      confirmDeleteTitle: "تأكيد الحذف",
      confirmDeleteDesc: (title: string) => `هتحذف تحليل وظيفة "${title}" نهائياً. مش هتقدر ترجعه تاني.`,
      cancel: "إلغاء",
      delete: "حذف",
      statusPending: "في الانتظار",
      statusProcessing: "جاري التحليل",
      statusCompleted: "مكتمل",
      statusError: "خطأ",
    },
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("job_analyses")
        .select("id, job_title, department, manager_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setRows(data as Row[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("job_analyses").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(t.deleteFailed);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success(t.deleted);
  };

  return (
    <div className="min-h-screen py-8 md:py-12" dir={dir}>
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            {t.home}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/submit" search={{ company_id: "", sector: "", department: "", position: "" }}>
              <Button size="sm" className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 ml-1.5" />
                {t.newAnalysis}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t.pastRequests}</h1>
          <p className="text-muted-foreground">{t.pastRequestsDesc}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="bg-gradient-card p-12 text-center shadow-soft">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">{t.noRequestsTitle}</h2>
            <p className="text-muted-foreground mb-6">{t.noRequestsDesc}</p>
            <Link to="/submit" search={{ company_id: "", sector: "", department: "", position: "" }}>
              <Button className="bg-gradient-hero text-primary-foreground">{t.startAnalysis}</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id} className="bg-gradient-card p-5 shadow-soft hover:shadow-elevated transition-all duration-200 hover:border-primary/40">
                <div className="flex items-center justify-between gap-4">
                  <Link to="/result/$id" params={{ id: r.id }} className="min-w-0 flex-1 cursor-pointer">
                    <h3 className="font-bold text-lg truncate">{r.job_title}</h3>
                    <div className="text-sm text-muted-foreground mt-1 space-x-2 space-x-reverse">
                      {r.department && <span>{r.department}</span>}
                      <span>· {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB")}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Status status={r.status} t={t} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingId === r.id}>
                          {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir={dir}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.confirmDeleteTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.confirmDeleteDesc(r.job_title)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ status, t }: { status: string; t: { statusPending: string; statusProcessing: string; statusCompleted: string; statusError: string } }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: t.statusPending, cls: "bg-muted text-muted-foreground" },
    processing: { label: t.statusProcessing, cls: "bg-primary/10 text-primary" },
    completed: { label: t.statusCompleted, cls: "bg-success/10 text-success" },
    error: { label: t.statusError, cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

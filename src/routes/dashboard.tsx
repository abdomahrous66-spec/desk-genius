import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            الرئيسية
          </Link>
          <Link to="/submit">
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 ml-1.5" />
              تحليل جديد
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">الطلبات السابقة</h1>
          <p className="text-muted-foreground">كل تحليلات الوظائف اللي اتعملت</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="bg-gradient-card p-12 text-center shadow-soft">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">مفيش طلبات لسة</h2>
            <p className="text-muted-foreground mb-6">ابدأ أول تحليل وظيفة دلوقتي</p>
            <Link to="/submit">
              <Button className="bg-gradient-hero text-primary-foreground">ابدأ تحليل</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Link key={r.id} to="/result/$id" params={{ id: r.id }}>
                <Card className="bg-gradient-card p-5 shadow-soft hover:shadow-elevated transition-all duration-200 hover:border-primary/40 cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg truncate">{r.job_title}</h3>
                      <div className="text-sm text-muted-foreground mt-1 space-x-2 space-x-reverse">
                        {r.department && <span>{r.department}</span>}
                        {r.manager_name && <span>· {r.manager_name}</span>}
                        <span>· {new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                    <Status status={r.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "في الانتظار", cls: "bg-muted text-muted-foreground" },
    processing: { label: "جاري التحليل", cls: "bg-primary/10 text-primary" },
    completed: { label: "مكتمل", cls: "bg-success/10 text-success" },
    error: { label: "خطأ", cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] || map.pending;
  return <span className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { useStructure } from "@/hooks/use-structure";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { TrainingNeed } from "@/lib/training";

export const Route = createFileRoute("/training/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة مؤشرات التدريب · نهضة مصر" },
      { name: "description", content: "مؤشرات خطة التدريب: التكلفة، الأيام، الساعات، الحضور والتوزيع حسب القطاع." },
      { property: "og:title", content: "لوحة مؤشرات التدريب · نهضة مصر" },
      { property: "og:description", content: "مؤشرات خطة التدريب: التكلفة، الأيام، الساعات، الحضور والتوزيع حسب القطاع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (<RequireAuth requireCap="viewTP"><DashboardPage /></RequireAuth>),
});

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 210 90% 60%))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--accent-foreground))"];
const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 1 });

function DashboardPage() {
  const { companies } = useStructure();
  const [rows, setRows] = useState<TrainingNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    (async () => {
      const all: TrainingNeed[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from("training_needs").select("*").range(from, from + PAGE - 1);
        if (error) break;
        const batch = (data as unknown as TrainingNeed[]) ?? [];
        all.push(...batch);
        if (batch.length < PAGE) break;
      }
      setRows(all);
      setLoading(false);
    })();
  }, []);

  const sectors = useMemo(() => Array.from(new Set(rows.map(r => r.sector).filter(Boolean) as string[])).sort(), [rows]);
  const years = useMemo(() => Array.from(new Set(rows.map(r => r.implementation_year).filter(Boolean) as number[])).sort(), [rows]);

  const data = useMemo(() => rows.filter(r =>
    (!company || r.company_id === company) &&
    (!sector || r.sector === sector) &&
    (!year || String(r.implementation_year) === year),
  ), [rows, company, sector, year]);

  const k = useMemo(() => {
    const total = data.length;
    const done = data.filter(r => (r.training_status || "").toLowerCase().includes("done") || r.status === "completed").length;
    const attended = data.filter(r => (r.attendance_status || "").toLowerCase().startsWith("attend")).length;
    const withAttendance = data.filter(r => !!r.attendance_status).length;
    return {
      total,
      progress: total ? (done / total) * 100 : 0,
      cost: data.reduce((s, r) => s + num(r.total_training_cost), 0),
      days: data.reduce((s, r) => s + num(r.training_days), 0),
      hours: data.reduce((s, r) => s + num(r.training_hours), 0),
      attendance: withAttendance ? (attended / withAttendance) * 100 : 0,
      approved: data.filter(r => r.status === "approved").length,
      pending: data.filter(r => r.status === "new").length,
    };
  }, [data]);

  const bySector = useMemo(() => groupSum(data, r => r.sector || "غير محدد"), [data]);
  const byType = useMemo(() => groupCount(data, r => r.training_type || "غير محدد"), [data]);
  const byQuarter = useMemo(() => groupSum(data, r => r.implementation_quarter || r.recommended_quarter_1 || "غير محدد"), [data]);
  const byDelivery = useMemo(() => groupCount(data, r => r.delivery_type || "غير محدد"), [data]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const summary = [
      ["Training Dashboard Report"], [],
      ["Metric", "Value"],
      ["Training Plan Progress (%)", Number(k.progress.toFixed(1))],
      ["Total Number of Training Delegates", k.total],
      ["Total Training Cost", k.cost],
      ["# of Training Days", k.days],
      ["# of Training Hours", k.hours],
      ["Complete Attendance Percentage (%)", Number(k.attendance.toFixed(1))],
      ["Approved", k.approved],
      ["Pending Approval", k.pending],
    ];
    const wsS = XLSX.utils.aoa_to_sheet(summary);
    wsS["!cols"] = [{ wch: 38 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsS, "Summary");

    const sheet = (name: string, header: string[], aoa: (string | number)[][]) => {
      const ws = XLSX.utils.aoa_to_sheet([header, ...aoa]);
      ws["!cols"] = header.map(() => ({ wch: 26 }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    sheet("By Sector", ["Sector", "Delegates", "Cost", "Days", "Hours"], bySector.map(r => [r.name, r.count, r.cost, r.days, r.hours]));
    sheet("By Type", ["Training Type", "Count"], byType.map(r => [r.name, r.value]));
    sheet("By Quarter", ["Quarter", "Delegates", "Cost", "Days", "Hours"], byQuarter.map(r => [r.name, r.count, r.cost, r.days, r.hours]));
    sheet("By Delivery", ["Delivery Type", "Count"], byDelivery.map(r => [r.name, r.value]));
    XLSX.writeFile(wb, "Training-Dashboard-Report.xlsx");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-bold">لوحة مؤشرات التدريب</div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={exportExcel}><Download className="w-4 h-4 ml-1" /> تنزيل التقرير</Button>
            <Link to="/"><Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15"><ArrowRight className="w-4 h-4 ml-1" /> الرئيسية</Button></Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 grid md:grid-cols-3 gap-4">
          <Filter label="الشركة" value={company} onChange={setCompany} options={companies.map(c => ({ v: c.id, l: c.name }))} />
          <Filter label="القطاع" value={sector} onChange={setSector} options={sectors.map(s => ({ v: s, l: s }))} />
          <Filter label="سنة التنفيذ" value={year} onChange={setYear} options={years.map(y => ({ v: String(y), l: String(y) }))} />
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Kpi title="Training Plan Progress" value={`${k.progress.toFixed(1)}%`} />
          <Kpi title="Total Training Delegates" value={fmt(k.total)} />
          <Kpi title="Total Training Cost" value={fmt(k.cost)} />
          <Kpi title="# of Training Days" value={fmt(k.days)} />
          <Kpi title="# of Training Hours" value={fmt(k.hours)} />
          <Kpi title="Attendance Percentage" value={`${k.attendance.toFixed(1)}%`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Training Plan Progress">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={[{ name: "Done", value: k.progress }, { name: "Remaining", value: 100 - k.progress }]}
                  dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Training Type Distribution">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={110} label>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Training Cost by Sector">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={bySector} layout="vertical" margin={{ right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Training Days & Hours by Sector">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={bySector} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Legend />
                <Bar dataKey="days" name="Days" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hours" name="Hours" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Delegates by Quarter">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byQuarter}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="count" name="Delegates" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Delivery Type">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byDelivery} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} label>
                  {byDelivery.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function groupSum(rows: TrainingNeed[], key: (r: TrainingNeed) => string) {
  const m = new Map<string, { name: string; count: number; cost: number; days: number; hours: number }>();
  for (const r of rows) {
    const n = key(r);
    const e = m.get(n) ?? { name: n, count: 0, cost: 0, days: 0, hours: 0 };
    e.count += 1; e.cost += num(r.total_training_cost); e.days += num(r.training_days); e.hours += num(r.training_hours);
    m.set(n, e);
  }
  return Array.from(m.values()).sort((a, b) => b.count - a.count);
}

function groupCount(rows: TrainingNeed[], key: (r: TrainingNeed) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-4 text-center border-primary/20">
      <div className="text-xs font-semibold text-primary mb-2 leading-tight">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-bold text-primary mb-3 text-center">{title}</h3>
      {children}
    </Card>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">الكل</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

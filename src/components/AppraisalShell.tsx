import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLang } from "@/hooks/use-i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Home } from "lucide-react";
import type { Cycle } from "@/lib/appraisal";

export function useIsOD() {
  const a = useAuth();
  return a.isSuperAdmin || a.isOwner || a.canAdminTP;
}

export function useCycles() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cycleId, setCycleId] = useState<string>("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const load = async () => {
    const [{ data }, { data: comps }] = await Promise.all([
      supabase.from("appraisal_cycles").select("*").order("year", { ascending: false }),
      supabase.from("companies").select("id,name").order("sort_order"),
    ]);
    const list = (data ?? []) as unknown as Cycle[];
    setCycles(list);
    setCompanies(comps ?? []);
    setCycleId(prev => (prev && list.some(c => c.id === prev) ? prev : list[0]?.id ?? ""));
  };
  useEffect(() => { load(); }, []);
  return { cycles, cycleId, setCycleId, cycle: cycles.find(c => c.id === cycleId) ?? null, companies, reload: load };
}

export function AppraisalShell({ title, children }: { title: string; children: React.ReactNode }) {
  const { dir, lang } = useLang();
  const isOD = useIsOD();
  const ar = lang === "ar";
  const links = [
    { to: "/appraisal", label: ar ? "فورم التقييم" : "Evaluation Form" },
    { to: "/appraisal/employees", label: ar ? "الموظفين والأهداف والجدارات" : "Employees, Objectives & Competencies" },
    ...(isOD ? [{ to: "/appraisal/settings", label: ar ? "إعدادات التقييم" : "Appraisal Settings" }] : []),
  ];
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 rounded hover:bg-white/15"><Home className="w-5 h-5" /></Link>
            <h1 className="font-bold text-lg">{title}</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {links.map(l => (
              <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
                className="px-3 py-1.5 rounded hover:bg-white/15" activeProps={{ className: "bg-white/20 font-semibold" }}>
                {l.label}
              </Link>
            ))}
            <LanguageToggle className="text-primary-foreground hover:bg-white/15" />
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8 space-y-6">{children}</main>
    </div>
  );
}

export function CyclePicker({ cycles, value, onChange, label }: { cycles: Cycle[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <select className="h-9 rounded-md border border-input bg-background px-3" value={value} onChange={e => onChange(e.target.value)}>
        {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year})</option>)}
      </select>
    </label>
  );
}

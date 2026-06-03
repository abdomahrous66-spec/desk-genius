import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import positionsData from "@/data/positions.json";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Building2, ChevronDown, ChevronLeft, FilePlus2, FileCheck2, Layers, Loader2, Search, Briefcase } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useScopes } from "@/hooks/use-scopes";

export const Route = createFileRoute("/structure")({
  component: () => (<RequireAuth><StructurePage /></RequireAuth>),
});

const PUBLISHING_POSITIONS = positionsData as Record<string, Record<string, string[]>>;

// نهضة مصر جروب → شركات → قطاعات → إدارات → وظائف
const COMPANIES: Record<string, Record<string, Record<string, string[]>>> = {
  "نهضة مصر للنشر": PUBLISHING_POSITIONS,
  "شركة دويتش للصناعات": {},
};

const GROUP_NAME = "نهضة مصر جروب";

type ApprovedJD = {
  id: string;
  job_title: string;
  department: string | null;
  sector: string | null;
};

function normalize(s: string) { return s.toLowerCase().trim(); }

function StructurePage() {
  const navigate = useNavigate();
  const { isAllowed, loading } = useScopes();
  const [query, setQuery] = useState("");
  const [openCompany, setOpenCompany] = useState<string | null>("نهضة مصر للنشر");
  const [openSector, setOpenSector] = useState<string | null>(null);
  const [openDept, setOpenDept] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState<ApprovedJD[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("job_analyses")
        .select("id, job_title, department, raw_input")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (!data) return;
      // deno-lint-ignore no-explicit-any
      setApproved(data.map((r: any) => ({
        id: r.id,
        job_title: r.job_title,
        department: r.department,
        sector: r.raw_input?.sector || null,
      })));
    })();
  }, []);

  // Index approved JDs by sector::dept::title (lowercased)
  const approvedIndex = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of approved) {
      const key = `${normalize(a.sector || "")}::${normalize(a.department || "")}::${normalize(a.job_title)}`;
      if (!map.has(key)) map.set(key, a.id);
    }
    return map;
  }, [approved]);

  const findApprovedId = (sector: string, dept: string, title: string) => {
    const d = dept === "-" ? "" : dept;
    return approvedIndex.get(`${normalize(sector)}::${normalize(d)}::${normalize(title)}`);
  };

  const goCreate = (sector: string, department: string, position: string) => {
    navigate({
      to: "/submit",
      search: { sector, department: department === "-" ? "" : department, position } as never,
    });
  };

  const goView = (id: string) => navigate({ to: "/result/$id", params: { id } });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const q = query.trim().toLowerCase();
  const matchesQuery = (text: string) => !q || text.toLowerCase().includes(q);

  return (
    <div className="min-h-screen py-8 md:py-12" dir="rtl">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" /> الرئيسية
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 inline-flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" /> {GROUP_NAME}
          </h1>
          <p className="text-muted-foreground">الهيكل التنظيمي — اختر الشركة ثم القطاع والإدارة والوظيفة، وابدأ تحليل JD أو اعرض الـ JD المعتمد.</p>
        </div>

        <Card className="p-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن شركة أو قطاع أو إدارة أو وظيفة..." className="pr-9" />
          </div>
        </Card>

        <div className="space-y-4">
          {Object.entries(COMPANIES).map(([company, sectorsObj]) => {
            const sectors = Object.keys(sectorsObj).filter(s => isAllowed(s)).sort();
            const sectorsFiltered = q
              ? sectors.filter(s => {
                  if (matchesQuery(s) || matchesQuery(company)) return true;
                  const depts = sectorsObj[s];
                  return Object.entries(depts).some(([d, ps]) => matchesQuery(d) || ps.some(p => matchesQuery(p)));
                })
              : sectors;
            const isCompanyOpen = openCompany === company || !!q;
            const totalPositions = Object.values(sectorsObj).reduce((sum, d) => sum + Object.values(d).reduce((a, b) => a + b.length, 0), 0);

            return (
              <Card key={company} className="bg-gradient-card shadow-elevated overflow-hidden border-primary/30">
                <button
                  type="button"
                  onClick={() => setOpenCompany(isCompanyOpen ? null : company)}
                  className="w-full p-5 flex items-center justify-between hover:bg-accent/30 transition"
                >
                  <div className="flex items-center gap-3 text-right">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-xl">{company}</div>
                      <div className="text-xs text-muted-foreground">{sectors.length} قطاع · {totalPositions} وظيفة</div>
                    </div>
                  </div>
                  {isCompanyOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>

                {isCompanyOpen && (
                  <div className="border-t border-border/60 p-3 space-y-3 bg-background/40">
                    {sectorsFiltered.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        {sectors.length === 0 ? "مفيش هيكل تنظيمي للشركة دي لسة." : "مفيش نتائج للبحث."}
                      </div>
                    ) : sectorsFiltered.map((sector) => {
                      const sectorKey = `${company}::${sector}`;
                      const isOpen = openSector === sectorKey || !!q;
                      const departments = Object.keys(sectorsObj[sector])
                        .filter(d => isAllowed(sector, d === "-" ? null : d))
                        .sort();
                      return (
                        <Card key={sectorKey} className="bg-card shadow-soft overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpenSector(isOpen ? null : sectorKey)}
                            className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition"
                          >
                            <div className="flex items-center gap-3 text-right">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-bold text-lg">{sector}</div>
                                <div className="text-xs text-muted-foreground">{departments.length} إدارة</div>
                              </div>
                            </div>
                            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                          </button>

                          {isOpen && (
                            <div className="border-t border-border/60 px-4 py-3 space-y-2 bg-background/40">
                              {departments.map((dept) => {
                                const key = `${sectorKey}::${dept}`;
                                const open = !!openDept[key] || !!q;
                                const positions = sectorsObj[sector][dept];
                                const displayDept = dept === "-" ? "(عام)" : dept;
                                return (
                                  <div key={key} className="rounded-md border border-border/60 bg-card">
                                    <button
                                      type="button"
                                      onClick={() => setOpenDept({ ...openDept, [key]: !open })}
                                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/20"
                                    >
                                      <div className="text-right">
                                        <span className="font-semibold">{displayDept}</span>
                                        <span className="text-xs text-muted-foreground mr-2">· {positions.length} وظيفة</span>
                                      </div>
                                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                    </button>
                                    {open && (
                                      <ul className="divide-y divide-border/60">
                                        {positions.map((pos) => {
                                          const approvedId = findApprovedId(sector, dept, pos);
                                          return (
                                            <li key={pos} className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-accent/10">
                                              <span className="text-sm flex items-center gap-2">
                                                {pos}
                                                {approvedId && (
                                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">JD معتمد</span>
                                                )}
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                {approvedId && (
                                                  <Button size="sm" variant="secondary" onClick={() => goView(approvedId)} className="gap-1.5">
                                                    <FileCheck2 className="w-4 h-4" /> عرض JD
                                                  </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => goCreate(sector, dept, pos)} className="gap-1.5">
                                                  <FilePlus2 className="w-4 h-4" /> إنشاء JD
                                                </Button>
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

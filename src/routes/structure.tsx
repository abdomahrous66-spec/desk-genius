import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Building2, ChevronDown, ChevronLeft, FilePlus2, FileCheck2, Layers, Loader2, Search } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/use-auth";
import { useScopes } from "@/hooks/use-scopes";
import { useStructure, NA_KEY, type Tree } from "@/hooks/use-structure";

export const Route = createFileRoute("/structure")({
  component: () => (<RequireAuth><StructurePage /></RequireAuth>),
});

const GROUP_NAME = "نهضة مصر جروب";

type ApprovedJD = {
  id: string;
  job_title: string;
  company_id: string | null;
  sector: string | null;
  department: string | null;
  section: string | null;
  subsection: string | null;
};

const norm = (s: string) => s.toLowerCase().trim();
const isReal = (k: string) => k && k !== NA_KEY;
const display = (k: string) => (isReal(k) ? k : "(عام)");

function StructurePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { isAllowed, loading: scopesLoading, scopes, isRestricted } = useScopes();
  const { companies, tree, loading: structLoading } = useStructure();
  const [query, setQuery] = useState("");
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const [approved, setApproved] = useState<ApprovedJD[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("job_analyses")
        .select("id, job_title, company_id, sector, department, section, subsection")
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      setApproved((data as ApprovedJD[] | null) ?? []);
    })();
  }, []);

  // Auto-expand allowed company/sector for restricted managers
  useEffect(() => {
    if (scopesLoading || structLoading || !isRestricted || !scopes?.length) return;
    const s = scopes[0];
    const updates: Record<string, boolean> = {};
    if (s.company_id) updates[`c:${s.company_id}`] = true;
    if (s.company_id && s.sector) updates[`c:${s.company_id}|s:${s.sector}`] = true;
    if (s.company_id && s.sector && s.department) updates[`c:${s.company_id}|s:${s.sector}|d:${s.department}`] = true;
    setOpenKeys(prev => ({ ...prev, ...updates }));
  }, [scopesLoading, structLoading, isRestricted, scopes]);

  const approvedIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of approved) {
      const k = `${a.company_id || ""}::${norm(a.sector || "")}::${norm(a.department || "")}::${norm(a.section || "")}::${norm(a.subsection || "")}::${norm(a.job_title)}`;
      if (!m.has(k)) m.set(k, a.id);
    }
    return m;
  }, [approved]);
  const findApproved = (companyId: string, sector: string, dept: string, sec: string, sub: string, title: string) => {
    const k = `${companyId}::${norm(isReal(sector) ? sector : "")}::${norm(isReal(dept) ? dept : "")}::${norm(isReal(sec) ? sec : "")}::${norm(isReal(sub) ? sub : "")}::${norm(title)}`;
    return approvedIndex.get(k);
  };

  if (scopesLoading || structLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const q = query.trim().toLowerCase();
  const m = (s: string) => !q || s.toLowerCase().includes(q);
  const isOpen = (k: string) => !!openKeys[k] || !!q;
  const toggle = (k: string) => setOpenKeys(p => ({ ...p, [k]: !isOpen(k) }));

  const childCompanies = companies.filter(c => c.parent_id);
  const visibleCompanies = childCompanies.filter(c => isAllowed(c.id, null, null));

  const goCreate = (companyId: string, sector: string, department: string, position: string) => {
    navigate({
      to: "/submit",
      search: {
        company_id: companyId,
        sector: isReal(sector) ? sector : "",
        department: isReal(department) ? department : "",
        position,
      } as never,
    });
  };

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
          <p className="text-muted-foreground">الهيكل التنظيمي — شركة → قطاع → إدارة → قسم → وظيفة.</p>
        </div>

        <Card className="p-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث..." className="pr-9" />
          </div>
        </Card>

        <div className="space-y-4">
          {visibleCompanies.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">مفيش شركات مسموح لك بيها.</Card>
          ) : visibleCompanies.map(c => {
            const compTree = tree[c.id] ?? {};
            const sectors = Object.keys(compTree)
              .filter(s => isAllowed(c.id, isReal(s) ? s : null, null))
              .filter(s => {
                if (!q) return true;
                if (m(s) || m(c.name)) return true;
                return JSON.stringify(compTree[s]).toLowerCase().includes(q);
              })
              .sort();
            const cKey = `c:${c.id}`;
            const cOpen = isOpen(cKey);
            const totalPos = Object.values(compTree).reduce((sum, d) =>
              sum + Object.values(d).reduce((s2, s) => s2 + Object.values(s).reduce((s3, ss) => s3 + Object.values(ss).reduce((a, b) => a + b.length, 0), 0), 0), 0);

            return (
              <Card key={c.id} className="bg-gradient-card shadow-elevated overflow-hidden border-primary/30">
                <button type="button" onClick={() => toggle(cKey)} className="w-full p-5 flex items-center justify-between hover:bg-accent/30">
                  <div className="flex items-center gap-3 text-right">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center"><Building2 className="w-6 h-6 text-primary" /></div>
                    <div>
                      <div className="font-bold text-xl">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{Object.keys(compTree).length} قطاع · {totalPos} وظيفة</div>
                    </div>
                  </div>
                  {cOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>

                {cOpen && (
                  <div className="border-t border-border/60 p-3 space-y-2 bg-background/40">
                    {sectors.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">مفيش بيانات هنا.</div>
                    ) : sectors.map(s => (
                      <SectorBlock
                        key={s}
                        company={c}
                        sector={s}
                        tree={compTree[s]}
                        isOpen={isOpen}
                        toggle={toggle}
                        isAllowed={isAllowed}
                        findApproved={findApproved}
                        goCreate={goCreate}
                        canCreateJD={auth.canCreateJD}
                        onView={(id) => navigate({ to: "/result/$id", params: { id } })}
                        q={q}
                      />
                    ))}
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

type SectorTree = Tree[string][string];
function SectorBlock({ company, sector, tree, isOpen, toggle, isAllowed, findApproved, goCreate, canCreateJD, onView, q }: {
  company: { id: string; name: string };
  sector: string;
  tree: SectorTree;
  isOpen: (k: string) => boolean;
  toggle: (k: string) => void;
  isAllowed: (cid?: string | null, sec?: string | null, dep?: string | null) => boolean;
  findApproved: (cid: string, sec: string, dep: string, s: string, ss: string, title: string) => string | undefined;
  goCreate: (cid: string, sec: string, dep: string, pos: string) => void;
  canCreateJD: boolean;
  onView: (id: string) => void;
  q: string;
}) {
  const key = `c:${company.id}|s:${sector}`;
  const open = isOpen(key);
  const depts = Object.keys(tree)
    .filter(d => isAllowed(company.id, isReal(sector) ? sector : null, isReal(d) ? d : null))
    .sort();
  return (
    <Card className="bg-card shadow-soft overflow-hidden">
      <button type="button" onClick={() => toggle(key)} className="w-full p-4 flex items-center justify-between hover:bg-accent/30">
        <div className="text-right">
          <span className="font-bold text-lg">{display(sector)}</span>
          <span className="text-xs text-muted-foreground mr-2">· {depts.length} إدارة</span>
        </div>
        {open ? <ChevronDown className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2 space-y-2 bg-background/40">
          {depts.map(d => (
            <Branch key={d} levelKey={`${key}|d:${d}`} title={display(d)} isOpen={isOpen} toggle={toggle}>
              {Object.keys(tree[d]).sort().map(s => {
                // Flatten all subsections into a single position list under Section
                const allPositions = Object.values(tree[d][s]).flat();
                return (
                  <Branch key={s} levelKey={`${key}|d:${d}|s:${s}`} title={display(s)} indent isOpen={isOpen} toggle={toggle}>
                    <ul className="divide-y divide-border/60">
                      {allPositions.map(p => {
                        const approvedId = findApproved(company.id, sector, d, s, p.subsection || "", p.position_title);
                        if (q && !p.position_title.toLowerCase().includes(q) && !display(d).toLowerCase().includes(q) && !display(s).toLowerCase().includes(q) && !display(sector).toLowerCase().includes(q)) return null;
                        return (
                          <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-accent/10">
                            <span className="text-sm flex items-center gap-2">
                              {p.position_title}
                              {approvedId && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">JD معتمد</span>}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {approvedId && (
                                <Button size="sm" variant="secondary" onClick={() => onView(approvedId)} className="gap-1.5">
                                  <FileCheck2 className="w-4 h-4" /> عرض JD
                                </Button>
                              )}
                              {canCreateJD && (
                                <Button size="sm" variant="outline" onClick={() => goCreate(company.id, sector, d, p.position_title)} className="gap-1.5">
                                  <FilePlus2 className="w-4 h-4" /> إنشاء JD
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Branch>
                );
              })}
            </Branch>
          ))}
        </div>
      )}
    </Card>
  );
}

function Branch({ levelKey, title, indent, isOpen, toggle, children }: {
  levelKey: string; title: string; indent?: boolean;
  isOpen: (k: string) => boolean; toggle: (k: string) => void; children: React.ReactNode;
}) {
  const open = isOpen(levelKey);
  return (
    <div className={`rounded-md border border-border/60 bg-card ${indent ? "mr-3" : ""}`}>
      <button type="button" onClick={() => toggle(levelKey)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/20">
        <span className="font-semibold text-sm">{title}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      {open && <div className="border-t border-border/60 p-2 space-y-2">{children}</div>}
    </div>
  );
}

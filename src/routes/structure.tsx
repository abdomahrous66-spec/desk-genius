import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import positionsData from "@/data/positions.json";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Building2, ChevronDown, ChevronLeft, FilePlus2, Layers, Loader2, Search } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useScopes } from "@/hooks/use-scopes";

export const Route = createFileRoute("/structure")({
  component: () => (<RequireAuth><StructurePage /></RequireAuth>),
});

const POSITIONS = positionsData as Record<string, Record<string, string[]>>;

function StructurePage() {
  const navigate = useNavigate();
  const { isAllowed, loading } = useScopes();
  const [query, setQuery] = useState("");
  const [openSector, setOpenSector] = useState<string | null>(null);
  const [openDept, setOpenDept] = useState<Record<string, boolean>>({});

  const sectors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.keys(POSITIONS)
      .filter(s => isAllowed(s))
      .filter(s => {
        if (!q) return true;
        if (s.toLowerCase().includes(q)) return true;
        const depts = POSITIONS[s];
        return Object.entries(depts).some(([d, positions]) =>
          d.toLowerCase().includes(q) || positions.some(p => p.toLowerCase().includes(q))
        );
      })
      .sort();
  }, [query, isAllowed]);

  const goCreate = (sector: string, department: string, position: string) => {
    navigate({
      to: "/submit",
      search: { sector, department: department === "-" ? "" : department, position } as never,
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

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
            <Layers className="w-8 h-8 text-primary" /> الهيكل التنظيمي
          </h1>
          <p className="text-muted-foreground">استعرض القطاعات والإدارات والوظائف، وابدأ تحليل لأي وظيفة بضغطة واحدة.</p>
        </div>

        <Card className="p-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قطاع أو إدارة أو وظيفة..." className="pr-9" />
          </div>
        </Card>

        {sectors.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            مفيش قطاعات متاحة ليك حالياً. كلّم الـ Admin يحدد صلاحياتك.
          </Card>
        ) : (
          <div className="space-y-3">
            {sectors.map((sector) => {
              const isOpen = openSector === sector;
              const departments = Object.keys(POSITIONS[sector])
                .filter(d => isAllowed(sector, d === "-" ? null : d))
                .sort();
              return (
                <Card key={sector} className="bg-gradient-card shadow-soft overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenSector(isOpen ? null : sector)}
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
                        const key = `${sector}::${dept}`;
                        const open = !!openDept[key];
                        const positions = POSITIONS[sector][dept];
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
                                {positions.map((pos) => (
                                  <li key={pos} className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-accent/10">
                                    <span className="text-sm">{pos}</span>
                                    <Button size="sm" variant="outline" onClick={() => goCreate(sector, dept, pos)} className="gap-1.5">
                                      <FilePlus2 className="w-4 h-4" /> إنشاء JD
                                    </Button>
                                  </li>
                                ))}
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
      </div>
    </div>
  );
}

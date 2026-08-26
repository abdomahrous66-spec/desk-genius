import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FileText, Sparkles, Send, Clock, Users, LogOut, Loader2, Layers,
  GraduationCap, ClipboardList, CalendarCheck, BarChart3, Building2,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import nahdetLogo from "@/assets/nahdet-misr-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة نهضة مصر · التحليل الوظيفي والهيكل والتدريب" },
      { name: "description", content: "منصة موحدة لإنشاء الوصف الوظيفي (JD)، إدارة الهيكل التنظيمي، وتجميع الاحتياجات التدريبية وخطة التدريب." },
      { property: "og:title", content: "منصة نهضة مصر · التحليل الوظيفي والهيكل والتدريب" },
      { property: "og:description", content: "إنشاء الوصف الوظيفي، إدارة الهيكل التنظيمي، والاحتياجات التدريبية وخطة التدريب في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tile = { to: string; search?: Record<string, string>; icon: typeof Send; title: string; desc: string };

function TileGrid({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map(t => (
        <Link key={t.title} to={t.to} search={t.search as never} className="block group">
          <Card className="h-full bg-gradient-card p-6 shadow-soft group-hover:shadow-elevated transition-all duration-300 border-border/50">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <t.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-1.5">{t.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, tiles }: { icon: typeof Send; title: string; subtitle: string; tiles: Tile[] }) {
  if (!tiles.length) return null;
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <TileGrid tiles={tiles} />
    </section>
  );
}

function Index() {
  const auth = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!auth.loading && !auth.user) nav({ to: "/login" });
  }, [auth, nav]);

  if (auth.loading || !auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCreateJD = auth.canCreateJD;
  const isOD = auth.isSuperAdmin || auth.isOwner;
  const roleLabel = auth.isOwner ? "Owner" : auth.isSuperAdmin ? "Super Admin" : auth.canCreateJD ? "Admin" : "Viewer";

  const jdTiles: Tile[] = [];
  if (canCreateJD) {
    jdTiles.push({ to: "/submit", search: { company_id: "", sector: "", department: "", position: "" }, icon: Send, title: "ابدأ تحليل وظيفي", desc: "املأ استمارة التحليل والـ AI يولّد الوصف الوظيفي كامل بصيغة Word." });
    jdTiles.push({ to: "/dashboard", icon: Clock, title: "الأوصاف الوظيفية (JD)", desc: "كل الـ JDs اللي اتعملت — عرض، تعديل، تحميل، وحذف." });
  }

  const structureTiles: Tile[] = [
    { to: "/structure", icon: Layers, title: "الهيكل التنظيمي", desc: "شجرة الشركات والقطاعات والإدارات والوظائف." },
  ];
  if (auth.canManageStructure) {
    structureTiles.push({ to: "/admin/structure", icon: Building2, title: "إدارة الهيكل", desc: "إنشاء شركات، رفع وظائف بالإكسل، تنزيل التمبلت والتقارير." });
  }
  if (auth.canManageUsers) {
    structureTiles.push({ to: "/users", icon: Users, title: "إدارة المستخدمين", desc: "إنشاء المستخدمين وتحديد الصلاحيات والنطاقات." });
  }

  const trainingTiles: Tile[] = [];
  if (auth.canTraining) {
    trainingTiles.push({ to: "/training/needs", icon: ClipboardList, title: "الاحتياجات التدريبية (TN)", desc: "المديرون يسجلون احتياجات فرقهم يدوياً أو برفع شيت Excel." });
  }
  if (isOD) {
    trainingTiles.push({ to: "/training/plan", icon: CalendarCheck, title: "خطة التدريب (TP)", desc: "اعتماد الاحتياجات وترحيلها للخطة واستكمال بياناتها وتصدير التقرير." });
    trainingTiles.push({ to: "/training/dashboard", icon: BarChart3, title: "Training Dashboard", desc: "مؤشرات التدريب: التكلفة، الأيام والساعات، الفعالية والتقييمات." });
  }

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <img src={nahdetLogo.url} alt="مجموعة شركات نهضة مصر" className="w-9 h-9 rounded-md bg-white p-0.5 object-contain" />
            <div className="font-bold tracking-wide">مجموعة شركات نهضة مصر</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-90">{roleLabel} · {auth.username}</span>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 ml-1" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-16 md:py-20 text-center space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm">
            <Sparkles className="w-4 h-4" />
            <span>منصة الموارد البشرية · نهضة مصر</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">التحليل الوظيفي، الهيكل، والتدريب</h1>
          <p className="text-lg opacity-90 leading-relaxed">
            كل شغل الـ HR في مكان واحد: الوصف الوظيفي بالـ AI، الهيكل التنظيمي للشركات، والاحتياجات التدريبية وخطة التدريب.
          </p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-6 py-12 space-y-14">
        <Section icon={FileText} title="JD · الوصف الوظيفي" subtitle="إنشاء وإدارة الأوصاف الوظيفية" tiles={jdTiles} />
        <Section icon={Layers} title="Structure · الهيكل التنظيمي" subtitle="الشركات والقطاعات والإدارات والوظائف" tiles={structureTiles} />
        <Section icon={GraduationCap} title="Training · التدريب" subtitle="الاحتياجات التدريبية وخطة التدريب والمؤشرات" tiles={trainingTiles} />
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-6">مجموعة شركات نهضة مصر · نظام الموارد البشرية الذكي</div>
      </footer>
    </div>
  );
}

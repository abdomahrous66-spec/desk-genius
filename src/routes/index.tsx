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
import { useLang, useT } from "@/hooks/use-i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nahdet Misr Platform · Job Analysis, Structure & Training" },
      { name: "description", content: "A unified platform to create job descriptions (JD), manage the organizational structure, and consolidate training needs and the training plan." },
      { property: "og:title", content: "Nahdet Misr Platform · Job Analysis, Structure & Training" },
      { property: "og:description", content: "Create job descriptions, manage the organizational structure, and handle training needs and the training plan in one place." },
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
  const { dir } = useLang();
  const t = useT({
    en: {
      groupName: "Nahdet Misr Group",
      groupNameAlt: "Nahdet Misr Group",
      signOut: "Sign Out",
      heroBadge: "HR Platform · Nahdet Misr",
      heroTitle: "Job Analysis, Structure & Training",
      heroDesc: "All HR work in one place: AI-generated job descriptions, organizational structure for companies, and training needs with the training plan.",
      startJd: "Start Job Analysis",
      startJdDesc: "Fill in the analysis form and AI generates the full job description as a Word document.",
      jdList: "Job Descriptions (JD)",
      jdListDesc: "All JDs that have been created — view, edit, download, and delete.",
      structureTitle: "Organizational Structure",
      structureDesc: "The tree of companies, sectors, departments and jobs.",
      manageStructure: "Manage Structure",
      manageStructureDesc: "Create companies, upload jobs via Excel, download templates and reports.",
      manageUsers: "Manage Users",
      manageUsersDesc: "Create users and set permissions and scopes.",
      trainingNeeds: "Training Needs (TN)",
      trainingNeedsDesc: "Managers record their teams' needs manually or by uploading an Excel sheet.",
      trainingPlan: "Training Plan (TP)",
      trainingPlanDesc: "Approve needs, move them to the plan, complete their data, and export the report.",
      trainingDashboard: "Training Dashboard",
      trainingDashboardDesc: "Training indicators: cost, days and hours, effectiveness and evaluations.",
      sectionJdTitle: "JD · Job Description",
      sectionJdSubtitle: "Create and manage job descriptions",
      sectionStructureTitle: "Structure · Organizational Structure",
      sectionStructureSubtitle: "Companies, sectors, departments and jobs",
      sectionTrainingTitle: "Training",
      sectionTrainingSubtitle: "Training needs, training plan and indicators",
      footer: "Nahdet Misr Group · Smart HR System",
    },
    ar: {
      groupName: "مجموعة شركات نهضة مصر",
      groupNameAlt: "مجموعة شركات نهضة مصر",
      signOut: "خروج",
      heroBadge: "منصة الموارد البشرية · نهضة مصر",
      heroTitle: "التحليل الوظيفي، الهيكل، والتدريب",
      heroDesc: "كل شغل الـ HR في مكان واحد: الوصف الوظيفي بالـ AI، الهيكل التنظيمي للشركات، والاحتياجات التدريبية وخطة التدريب.",
      startJd: "ابدأ تحليل وظيفي",
      startJdDesc: "املأ استمارة التحليل والـ AI يولّد الوصف الوظيفي كامل بصيغة Word.",
      jdList: "الأوصاف الوظيفية (JD)",
      jdListDesc: "كل الـ JDs اللي اتعملت — عرض، تعديل، تحميل، وحذف.",
      structureTitle: "الهيكل التنظيمي",
      structureDesc: "شجرة الشركات والقطاعات والإدارات والوظائف.",
      manageStructure: "إدارة الهيكل",
      manageStructureDesc: "إنشاء شركات، رفع وظائف بالإكسل، تنزيل التمبلت والتقارير.",
      manageUsers: "إدارة المستخدمين",
      manageUsersDesc: "إنشاء المستخدمين وتحديد الصلاحيات والنطاقات.",
      trainingNeeds: "الاحتياجات التدريبية (TN)",
      trainingNeedsDesc: "المديرون يسجلون احتياجات فرقهم يدوياً أو برفع شيت Excel.",
      trainingPlan: "خطة التدريب (TP)",
      trainingPlanDesc: "اعتماد الاحتياجات وترحيلها للخطة واستكمال بياناتها وتصدير التقرير.",
      trainingDashboard: "Training Dashboard",
      trainingDashboardDesc: "مؤشرات التدريب: التكلفة، الأيام والساعات، الفعالية والتقييمات.",
      sectionJdTitle: "JD · الوصف الوظيفي",
      sectionJdSubtitle: "إنشاء وإدارة الأوصاف الوظيفية",
      sectionStructureTitle: "Structure · الهيكل التنظيمي",
      sectionStructureSubtitle: "الشركات والقطاعات والإدارات والوظائف",
      sectionTrainingTitle: "Training · التدريب",
      sectionTrainingSubtitle: "الاحتياجات التدريبية وخطة التدريب والمؤشرات",
      footer: "مجموعة شركات نهضة مصر · نظام الموارد البشرية الذكي",
    },
  });

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
    jdTiles.push({ to: "/submit", search: { company_id: "", sector: "", department: "", position: "" }, icon: Send, title: t.startJd, desc: t.startJdDesc });
  }
  if (auth.canViewJD) {
    jdTiles.push({ to: "/dashboard", icon: Clock, title: t.jdList, desc: t.jdListDesc });
  }


  const structureTiles: Tile[] = [
    { to: "/structure", icon: Layers, title: t.structureTitle, desc: t.structureDesc },
  ];
  if (auth.canManageStructure) {
    structureTiles.push({ to: "/admin/structure", icon: Building2, title: t.manageStructure, desc: t.manageStructureDesc });
  }
  if (auth.canManageUsers) {
    structureTiles.push({ to: "/users", icon: Users, title: t.manageUsers, desc: t.manageUsersDesc });
  }

  const trainingTiles: Tile[] = [];
  if (auth.canTraining) {
    trainingTiles.push({ to: "/training/needs", icon: ClipboardList, title: t.trainingNeeds, desc: t.trainingNeedsDesc });
  }
  if (auth.canViewTP || isOD) {
    trainingTiles.push({ to: "/training/plan", icon: CalendarCheck, title: t.trainingPlan, desc: t.trainingPlanDesc });
    trainingTiles.push({ to: "/training/dashboard", icon: BarChart3, title: t.trainingDashboard, desc: t.trainingDashboardDesc });
  }


  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <img src={nahdetLogo.url} alt={t.groupNameAlt} className="w-9 h-9 rounded-md bg-white p-0.5 object-contain" />
            <div className="font-bold tracking-wide">{t.groupName}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="opacity-90">{roleLabel} · {auth.username}</span>
            <LanguageToggle className="text-primary-foreground hover:bg-white/15" />
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 ml-1" /> {t.signOut}
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-16 md:py-20 text-center space-y-5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm">
            <Sparkles className="w-4 h-4" />
            <span>{t.heroBadge}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">{t.heroTitle}</h1>
          <p className="text-lg opacity-90 leading-relaxed">
            {t.heroDesc}
          </p>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-6 py-12 space-y-14">
        <Section icon={FileText} title={t.sectionJdTitle} subtitle={t.sectionJdSubtitle} tiles={jdTiles} />
        <Section icon={Layers} title={t.sectionStructureTitle} subtitle={t.sectionStructureSubtitle} tiles={structureTiles} />
        <Section icon={GraduationCap} title={t.sectionTrainingTitle} subtitle={t.sectionTrainingSubtitle} tiles={trainingTiles} />
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-6">{t.footer}</div>
      </footer>
    </div>
  );
}

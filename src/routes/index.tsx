import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Sparkles, Send, Clock, Users, LogOut, Loader2, Layers } from "lucide-react";
import { useAuth, signOut } from "@/hooks/use-auth";
import nahdetLogo from "@/assets/nahdet-misr-logo.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

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
  const canManage = auth.canManageUsers || auth.canManageStructure;
  const roleLabel = auth.isOwner ? "Owner" : auth.isSuperAdmin ? "Super Admin" : auth.canCreateJD ? "Admin" : "Viewer";

  // Viewer view: structure only, no job analysis creation.
  if (!canCreateJD && !canManage) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <img src={nahdetLogo.url} alt="Nahdet Misr" className="w-9 h-9 rounded-md bg-white p-0.5 object-contain" />
              <div className="font-bold tracking-wide">مجموعة شركات نهضة مصر</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="opacity-90">مرحباً، {auth.username}</span>
              <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 ml-1" /> خروج
              </Button>
            </div>
          </div>
        </header>

        <section className="flex-1 bg-gradient-hero text-primary-foreground flex items-center justify-center">
          <div className="container mx-auto px-6 py-20 text-center space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm">
              <Sparkles className="w-4 h-4" />
              <span>منصة تحليل الوظائف · نهضة مصر</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              الهيكل التنظيمي
            </h1>
            <p className="text-lg opacity-90">اعرض الهيكل التنظيمي والـ JDs المعتمدة حسب الصلاحيات المحددة لك.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <Link to="/structure">
                <Button size="lg" variant="secondary" className="text-base px-10 py-6 shadow-elevated">
                  <Layers className="w-5 h-5 ml-2" />
                  الهيكل التنظيمي
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Admin view: full home with dashboard + users management.
  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <div className="font-bold tracking-wide">مجموعة شركات نهضة مصر</div>
          <div className="flex items-center gap-3">
            <span className="opacity-90">{roleLabel} · {auth.username}</span>
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/15" onClick={() => signOut()}>
              <LogOut className="w-4 h-4 ml-1" /> خروج
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm">
              <Sparkles className="w-4 h-4" />
              <span>لوحة الإدارة · نهضة مصر</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              تحليل الوظائف بسهولة وذكاء
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed">
              حسب صلاحيتك تقدر تعرض الهيكل، تنشئ JD، وتدير المستخدمين والشركات.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 flex-wrap">
              {canCreateJD && (
                <Link to="/submit">
                  <Button size="lg" variant="secondary" className="text-base px-8 shadow-elevated">
                    <Send className="w-5 h-5 ml-2" /> ابدأ تحليل وظيفة
                  </Button>
                </Link>
              )}
              {canCreateJD && (
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Clock className="w-5 h-5 ml-2" /> الطلبات السابقة
                  </Button>
                </Link>
              )}
              <Link to="/structure">
                <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Layers className="w-5 h-5 ml-2" /> الهيكل التنظيمي
                </Button>
              </Link>
              {auth.canManageStructure && (
                <Link to="/admin/structure">
                  <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Layers className="w-5 h-5 ml-2" /> إدارة الهيكل
                  </Button>
                </Link>
              )}
              {auth.canManageUsers && (
                <Link to="/users">
                  <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Users className="w-5 h-5 ml-2" /> إدارة المستخدمين
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">إزاي بيشتغل؟</h2>
          <p className="text-muted-foreground text-lg">3 خطوات بسيطة للحصول على Job Description احترافي</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Send, title: "1. حدد الصلاحية", desc: "عرض فقط، إنشاء JD، سوبر أدمن، أو مالك" },
            { icon: Sparkles, title: "2. الذكاء الاصطناعي يحلل", desc: "حتى لو المدير ساب حقول فاضية، الـ AI بيستكمل بخبرة HR" },
            { icon: FileText, title: "3. ملف Word جاهز", desc: "حمّل Job Profile متطابق مع تمبليت نهضة مصر" },
          ].map((step, i) => (
            <Card key={i} className="bg-gradient-card p-8 shadow-soft hover:shadow-elevated transition-all duration-300 border-border/50">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-6">
          مجموعة شركات نهضة مصر · نظام تحليل الوظائف الذكي
        </div>
      </footer>
    </div>
  );
}

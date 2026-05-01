import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Sparkles, Send, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm">
              <Sparkles className="w-4 h-4" />
              <span>مدعوم بالذكاء الاصطناعي</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              تحليل الوظائف بسهولة وذكاء
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed">
              ابعت لينك للمدير، يملأ المعلومات اللي يعرفها عن الوظيفة، والذكاء الاصطناعي يحوّلها
              لتحليل وظيفي احترافي كامل بالإنجليزي
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/submit">
                <Button size="lg" variant="secondary" className="text-base px-8 shadow-elevated">
                  <Send className="w-5 h-5 ml-2" />
                  ابدأ تحليل وظيفة
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Clock className="w-5 h-5 ml-2" />
                  عرض الطلبات السابقة
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">إزاي بيشتغل؟</h2>
          <p className="text-muted-foreground text-lg">3 خطوات بسيطة للحصول على تحليل وظيفي احترافي</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Send,
              title: "1. شارك اللينك",
              desc: "ابعت اللينك للمدير علشان يدخل بيانات الوظيفة في فورم منظّم وسهل",
            },
            {
              icon: Sparkles,
              title: "2. الذكاء الاصطناعي يحلل",
              desc: "حتى لو المدير ساب حقول فاضية، الـ AI بيستكمل بناءً على خبرته في الموارد البشرية",
            },
            {
              icon: FileText,
              title: "3. تحليل وظيفي جاهز",
              desc: "تحصل على Job Analysis احترافي بالإنجليزي يشمل المهام، المهارات، الـ KPIs والمزيد",
            },
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
          نظام تحليل الوظائف الذكي · مدعوم بالذكاء الاصطناعي
        </div>
      </footer>
    </div>
  );
}

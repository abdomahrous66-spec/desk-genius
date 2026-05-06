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
      {/* Top bar */}
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between text-sm">
          <div className="font-bold tracking-wide">مجموعة شركات نهضة مصر</div>
          <div className="opacity-90">Nahdet Misr Publishing Group</div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-sm">
              <Sparkles className="w-4 h-4" />
              <span>منصة تحليل الوظائف · نهضة مصر</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              تحليل الوظائف بسهولة وذكاء
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed">
              منصة داخلية لمجموعة شركات نهضة مصر — المدير يدخل ما يعرفه عن الوظيفة،
              والذكاء الاصطناعي يحوّلها لتوصيف وظيفي احترافي كامل بصيغة Word.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/submit">
                <Button size="lg" variant="secondary" className="text-base px-8 shadow-elevated">
                  <Send className="w-5 h-5 ml-2" />
                  ابدأ تحليل وظيفة
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
          <p className="text-muted-foreground text-lg">3 خطوات بسيطة للحصول على Job Description احترافي</p>
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
              title: "3. ملف Word جاهز",
              desc: "حمّل Job Profile متطابق مع تمبليت نهضة مصر — جاهز للطباعة والاعتماد",
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
          مجموعة شركات نهضة مصر · نظام تحليل الوظائف الذكي
        </div>
      </footer>
    </div>
  );
}

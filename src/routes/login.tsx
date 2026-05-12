import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(true);

  // Ensure bootstrap admin exists, and redirect if already signed in.
  useEffect(() => {
    const init = async () => {
      try {
        await supabase.functions.invoke("ensure-admin");
      } catch (e) {
        console.error(e);
      } finally {
        setSeeding(false);
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) nav({ to: "/" });
    };
    init();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    const email = `${username.trim().toLowerCase()}@nahdetmisr.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }
    toast.success("تم تسجيل الدخول");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero px-4" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">مجموعة شركات نهضة مصر</h1>
          <p className="text-sm text-muted-foreground">منصة تحليل الوظائف — تسجيل الدخول</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="u">اسم المستخدم</Label>
            <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required disabled={loading || seeding} />
          </div>
          <div>
            <Label htmlFor="p">كلمة المرور</Label>
            <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={loading || seeding} />
          </div>
          <Button type="submit" className="w-full bg-gradient-hero text-primary-foreground" disabled={loading || seeding}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogIn className="w-4 h-4 ml-2" /> دخول</>}
          </Button>
          {seeding && <p className="text-xs text-center text-muted-foreground">جاري التحضير...</p>}
        </form>
      </Card>
    </div>
  );
}

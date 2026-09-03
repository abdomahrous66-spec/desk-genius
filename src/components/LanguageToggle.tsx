import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/hooks/use-i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={className}
      onClick={toggle}
      aria-label={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <Languages className="w-4 h-4 mr-1" />
      {lang === "en" ? "العربية" : "English"}
    </Button>
  );
}

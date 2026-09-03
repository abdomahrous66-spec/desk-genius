import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ar";

const STORAGE_KEY = "app_lang";

type Ctx = { lang: Lang; dir: "ltr" | "rtl"; setLang: (l: Lang) => void; toggle: () => void };

const LanguageContext = createContext<Ctx>({ lang: "en", dir: "ltr", setLang: () => {}, toggle: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // English is always the default; Arabic only when the user opted in.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "ar" || stored === "en") setLangState(stored);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggle: () => setLang(lang === "ar" ? "en" : "ar"),
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}

/** Local per-page dictionary helper: `const t = useT({ en: {...}, ar: {...} })`. */
export function useT<T extends Record<string, string>>(dict: { en: T; ar: T }): T {
  const { lang } = useLang();
  return lang === "ar" ? dict.ar : dict.en;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGemini, parseJsonLoose } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { jd, target } = await req.json();
    if (!jd || (target !== "ar" && target !== "en")) {
      return new Response(JSON.stringify({ error: "jd + target (ar|en) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetLang = target === "ar" ? "Modern Standard Arabic (professional)" : "Professional English";
    const prompt = `Translate ALL TEXT VALUES in this JSON Job Description to ${targetLang}. Preserve the EXACT same JSON structure and keys. Do NOT translate keys. Do NOT translate proper names (people, companies, brand names like "Nahdet Misr"). Keep numbers, dates, version strings, locations like "Borg" untouched. Translate every string value (titles, purposes, responsibilities, KRAs, KPIs, education, competencies, work environment fields, etc.).

Return ONLY the JSON object — no fences, no commentary.

Input JSON:
${JSON.stringify(jd)}`;

    const out = await callGemini({
      system: "You are a professional bilingual HR translator. Return ONLY valid JSON with the exact same shape.",
      user: prompt,
      json: true,
      temperature: 0.2,
      model: "gemini-2.0-flash",
    });
    const translated = parseJsonLoose<Record<string, unknown>>(out);
    return new Response(JSON.stringify({ success: true, jd: translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-jd error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

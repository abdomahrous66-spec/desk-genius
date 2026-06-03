import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are an HR data extraction assistant. Parse the following job-related text (could be JD, form, notes, sheet rows, anything) and extract structured fields. Use "" or "N/A" if a field is unknown. Output language: match input language. For arrays, return [] if not found.

Input text:
"""
${text.slice(0, 40000)}
"""

Return ONLY a JSON object (no fences) with these keys:
{
  "job_title":"", "sector":"", "department":"", "location":"",
  "reportsTo":"", "directReports":"", "purpose":"", "tasks":"",
  "qualifications":"", "workingConditions":"", "kpis":"", "notes":"",
  "pd_authority":"", "pd_financial":"", "pd_annual":"", "pd_hiring":"",
  "reports":[{"name":"","frequency":"","purpose":"","presented_to":""}]
}

Guidance: tasks = bullet list (one per line). directReports = one per line. pd_* = "N/A" if missing. reports = list of recurring reports produced by the role.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Return ONLY valid JSON, no markdown fences, no commentary." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI Gateway error:", resp.status, t);
      const msg = resp.status === 429 ? "حد الاستخدام، جرب بعد دقيقة"
        : resp.status === 402 ? "نفد رصيد الـ AI — اشحن من إعدادات Lovable Cloud"
        : "فشل استخراج البيانات بالـ AI";
      return new Response(JSON.stringify({ error: msg, detail: t }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const out: string | undefined = data?.choices?.[0]?.message?.content;
    if (!out) throw new Error("AI returned no content");
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(out); }
    catch { parsed = JSON.parse(out.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()); }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-job-doc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

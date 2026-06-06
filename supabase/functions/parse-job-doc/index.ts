import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callGemini, parseJsonLoose } from "../_shared/gemini.ts";

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

    const prompt = `You are an HR data extraction assistant. Parse the following job-related text and extract structured fields. Use "" or "N/A" if unknown. Match input language. Arrays default to [].

Input text:
"""
${text.slice(0, 40000)}
"""

Return ONLY a JSON object with these keys:
{
  "job_title":"", "sector":"", "department":"", "location":"",
  "reportsTo":"", "directReports":"", "purpose":"", "tasks":"",
  "qualifications":"", "workingConditions":"", "kpis":"", "notes":"",
  "pd_authority":"", "pd_financial":"", "pd_annual":"", "pd_hiring":"",
  "reports":[{"name":"","frequency":"","purpose":"","presented_to":""}]
}
tasks = bullet list (one per line). directReports = one per line. pd_* = "N/A" if missing.`;

    const out = await callGemini({
      system: "Return ONLY valid JSON, no markdown fences.",
      user: prompt,
      json: true,
      temperature: 0.2,
    });
    const parsed = parseJsonLoose<Record<string, unknown>>(out);

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

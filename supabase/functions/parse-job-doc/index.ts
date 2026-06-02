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
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GEMINI_KEY) throw new Error("GOOGLE_GEMINI_API_KEY missing");

    const schema = {
      type: "object",
      properties: {
        job_title: { type: "string" },
        sector: { type: "string" },
        department: { type: "string" },
        location: { type: "string" },
        reportsTo: { type: "string" },
        directReports: { type: "string" },
        purpose: { type: "string" },
        tasks: { type: "string" },
        qualifications: { type: "string" },
        workingConditions: { type: "string" },
        kpis: { type: "string" },
        notes: { type: "string" },
        pd_authority: { type: "string" },
        pd_financial: { type: "string" },
        pd_annual: { type: "string" },
        pd_hiring: { type: "string" },
        reports: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" }, frequency: { type: "string" },
              purpose: { type: "string" }, presented_to: { type: "string" },
            },
            required: ["name", "frequency", "purpose", "presented_to"],
          },
        },
      },
      required: [
        "job_title", "sector", "department", "location", "reportsTo", "directReports",
        "purpose", "tasks", "qualifications", "workingConditions", "kpis", "notes",
        "pd_authority", "pd_financial", "pd_annual", "pd_hiring", "reports",
      ],
    };

    const prompt = `You are an HR data extraction assistant. Parse the following job-related text (could be a JD, form, notes, anything) and extract structured fields. Use empty string "" or "N/A" if a field is unknown. Output language: match the input language. For arrays, return [] if not found.

Input text:
"""
${text.slice(0, 20000)}
"""

Extraction guidance:
- job_title: the position name.
- sector / department: the organizational unit (best guess).
- location: physical office/site if mentioned.
- reportsTo: direct manager title.
- directReports: list of subordinate titles (one per line if multiple).
- purpose: main job purpose (1-3 sentences).
- tasks: all tasks/responsibilities as bullet points (one per line).
- qualifications: education, experience, skills.
- workingConditions: hours, environment, internal/external communication.
- kpis: KPIs if mentioned.
- pd_authority/financial/annual/hiring: position dimensions (use "N/A" if missing).
- reports: list of reports the role produces (name, frequency, purpose, presented_to).
- notes: anything else worth keeping.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: schema,
          temperature: 0.2,
        },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI extraction failed", detail: t }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!out) throw new Error("Gemini returned no content");
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import competenciesData from "./data/competencies.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CompMap = Record<string, { core?: string[]; functional?: string[]; leadership?: string[] }>;
const COMPS = competenciesData as CompMap;

function lookupComps(title: string) {
  if (!title) return null;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const t = norm(title);
  for (const k of Object.keys(COMPS)) {
    if (norm(k) === t) return COMPS[k];
  }
  for (const k of Object.keys(COMPS)) {
    const nk = norm(k);
    if (nk.includes(t) || t.includes(nk)) return COMPS[k];
  }
  return null;
}

// Strip JSON-schema fields Gemini doesn't accept
// deno-lint-ignore no-explicit-any
function cleanSchema(s: any): any {
  if (Array.isArray(s)) return s.map(cleanSchema);
  if (s && typeof s === "object") {
    // deno-lint-ignore no-explicit-any
    const out: any = {};
    for (const [k, v] of Object.entries(s)) {
      if (k === "additionalProperties") continue;
      out[k] = cleanSchema(v);
    }
    return out;
  }
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysisId } = await req.json();
    const GEMINI_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!GEMINI_KEY) throw new Error("GOOGLE_GEMINI_API_KEY missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: record, error: fetchErr } = await supabase
      .from("job_analyses").select("*").eq("id", analysisId).single();
    if (fetchErr || !record) throw new Error("Analysis record not found");

    const input = record.raw_input as Record<string, unknown>;
    const matched = lookupComps(record.job_title);
    const compHint = matched
      ? `MATCHED COMPETENCIES from company database for this position (use these EXACT names):
- core: ${(matched.core || []).join(", ") || "(none — pick 3-5 standard core)"}
- functional: ${(matched.functional || []).join(", ") || "(none — pick 3-6 role-specific)"}
- leadership: ${(matched.leadership || []).join(", ") || "(none — pick 3-5 if managerial else [])"}`
      : "No exact competency match found in DB. Pick standard names from common HR frameworks.";

    const pdInput = (input.position_dimensions_input as Record<string, string>) || {};
    const reportsInput = (input.reports_input as Array<Record<string, string>>) || [];
    const outputLang = (input.output_language as string) || "en";

    const jdSchema = {
      type: "object",
      properties: {
        position_title: { type: "string" },
        sector: { type: "string" },
        reporting_to: { type: "string" },
        department: { type: "string" },
        location: { type: "string" },
        no_of_direct_reports: { type: "string" },
        last_update: { type: "string" },
        no_of_total_subordinate: { type: "string" },
        version_number: { type: "string" },
        type_of_employment: { type: "string" },
        main_job_purpose: { type: "string" },
        key_result_areas: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              responsibilities: { type: "array", items: { type: "string" } },
              kras: { type: "array", items: { type: "string" } },
            },
            required: ["area", "responsibilities", "kras"],
          },
        },
        hse_kra: {
          type: "object",
          properties: {
            responsibilities: { type: "array", items: { type: "string" } },
            kras: { type: "array", items: { type: "string" } },
          },
          required: ["responsibilities", "kras"],
        },
        internal_communication: { type: "array", items: { type: "string" } },
        external_communication: { type: "array", items: { type: "string" } },
        work_environment: {
          type: "object",
          properties: {
            indoor: { type: "string" }, outdoor: { type: "string" },
            working_hazards: { type: "string" }, working_days: { type: "string" },
            days_off: { type: "string" }, working_hours: { type: "string" },
          },
          required: ["indoor", "outdoor", "working_hazards", "working_days", "days_off", "working_hours"],
        },
        reports: {
          type: "array",
          items: {
            type: "object",
            properties: {
              report_name: { type: "string" }, frequency: { type: "string" },
              report_purpose: { type: "string" }, presented_to: { type: "string" },
            },
            required: ["report_name", "frequency", "report_purpose", "presented_to"],
          },
        },
        reporting_structure: { type: "string" },
        kpis: {
          type: "array",
          items: {
            type: "object",
            properties: { kpi: { type: "string" }, measurement: { type: "string" }, target: { type: "string" } },
            required: ["kpi", "measurement", "target"],
          },
        },
        position_dimensions: {
          type: "object",
          properties: {
            level_of_authority: { type: "array", items: { type: "string" } },
            financial_control: { type: "array", items: { type: "string" } },
            annual_amount: { type: "array", items: { type: "string" } },
            hiring_promotion_authority: { type: "array", items: { type: "string" } },
          },
          required: ["level_of_authority", "financial_control", "annual_amount", "hiring_promotion_authority"],
        },
        qualifications: {
          type: "object",
          properties: {
            education: { type: "array", items: { type: "string" } },
            experience: { type: "array", items: { type: "string" } },
            computer_skills: { type: "array", items: { type: "string" } },
            language_skills: { type: "array", items: { type: "string" } },
            core_competencies: { type: "array", items: { type: "string" } },
            functional_competencies: { type: "array", items: { type: "string" } },
            leadership_competencies: { type: "array", items: { type: "string" } },
          },
          required: ["education", "experience", "computer_skills", "language_skills", "core_competencies", "functional_competencies", "leadership_competencies"],
        },
        structure_boxes: {
          type: "object",
          properties: {
            manager: { type: "string" }, position: { type: "string" },
            subordinates: { type: "array", items: { type: "string" } },
          },
          required: ["manager", "position", "subordinates"],
        },
      },
      required: [
        "position_title", "sector", "reporting_to", "department", "location",
        "no_of_direct_reports", "last_update", "no_of_total_subordinate",
        "version_number", "type_of_employment", "main_job_purpose",
        "key_result_areas", "hse_kra", "internal_communication", "external_communication",
        "work_environment", "reports", "position_dimensions", "qualifications",
        "reporting_structure", "kpis", "structure_boxes",
      ],
    };

    const outerSchema = cleanSchema({
      type: "object",
      properties: {
        analysis_markdown: { type: "string" },
        jd: jdSchema,
      },
      required: ["analysis_markdown", "jd"],
    });

    const today = new Date().toISOString().slice(0, 10);
    const langInstr = outputLang === "ar"
      ? "Modern Standard Arabic (professional, formal)"
      : "Professional English";

    const userPrompt = `You are an expert HR consultant for Nahdet Misr Publishing Group. Fill any missing professional details with industry-standard content. OUTPUT LANGUAGE for both analysis_markdown and jd content: ${langInstr}.

Manager input:
- Job Title: ${record.job_title}
- Sector: ${input.sector || "(infer)"}
- Department: ${record.department || "(infer)"}
- Location (REQUIRED, use exactly): ${input.location || "Borg"}
- Purpose: ${input.purpose || "(infer)"}
- Tasks & Responsibilities: ${input.tasks || ""}
- Qualifications: ${input.qualifications || ""}
- Working Conditions + Internal/External Communication: ${input.workingConditions || ""}
- Reports To: ${input.reportsTo || ""}
- Direct Subordinates: ${input.directReports || "(infer 3-6 if not given, or [] for IC)"}
- KPIs (if empty, return []): ${input.kpis || "(EMPTY - return [])"}
- Notes: ${input.notes || "None"}

Manager-provided REPORTS (use exactly, do not invent more):
${JSON.stringify(reportsInput, null, 2)}

Manager-provided POSITION DIMENSIONS (split each into bullet array; if "N/A" return ["N/A"]):
- level_of_authority: ${pdInput.level_of_authority || "N/A"}
- financial_control: ${pdInput.financial_control || "N/A"}
- annual_amount: ${pdInput.annual_amount || "N/A"}
- hiring_promotion_authority: ${pdInput.hiring_promotion_authority || "N/A"}

${compHint}

Today: ${today}

Return a JSON object with exactly two fields:
1) "analysis_markdown": Full Job Analysis as markdown text in ${langInstr}.
2) "jd": Job Description object matching the schema.

CRITICAL RULES:
- "location": exactly "${input.location || "Borg"}".
- "reports": use the EXACT manager-provided list. Skip rows whose name is "N/A". Do not invent extra rows.
- "position_dimensions": use the manager-provided values (split into bullet arrays). If value is "N/A" return ["N/A"].
- "structure_boxes": ALWAYS populate. manager = Reports-To title, position = job title, subordinates = list.
- "key_result_areas": 5-8 KRAs (each 4-8 responsibilities, 3-6 KRAs).
- "hse_kra": MANDATORY. Health/Safety/Environment block (4-7 responsibilities + 3-5 KRAs).
- Competencies: use MATCHED names exactly when provided. NAMES ONLY, no indicators.
- "kpis": only if manager provided; else [].
- last_update = today. version_number = "1.0". type_of_employment = "Full-Time".
- ALL text content in ${langInstr}.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "You are an expert HR consultant. Always return a complete, valid JSON object matching the requested schema with thorough professional content." }],
        },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: outerSchema,
          temperature: 0.4,
        },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, t);
      const status = aiResponse.status;
      const msg = status === 429 ? "Gemini rate limit — try again in a minute"
        : status === 403 ? "Invalid Gemini API key or access denied"
        : "Gemini API error";
      await supabase.from("job_analyses").update({ status: "error", analysis_result: msg }).eq("id", analysisId);
      return new Response(JSON.stringify({ error: msg, detail: t }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");

    let parsed: { analysis_markdown: string; jd: Record<string, unknown> };
    try {
      parsed = JSON.parse(text);
    } catch {
      // Sometimes Gemini wraps JSON in ```json fences
      const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(clean);
    }

    const analysisMarkdown: string = parsed.analysis_markdown;
    // deno-lint-ignore no-explicit-any
    const jd: any = parsed.jd;

    if (jd.hse_kra && (jd.hse_kra.responsibilities?.length || jd.hse_kra.kras?.length)) {
      jd.key_result_areas = jd.key_result_areas || [];
      jd.key_result_areas.push({
        area: outputLang === "ar" ? "الصحة والسلامة والبيئة (HSE)" : "Health, Safety & Environment (HSE)",
        responsibilities: jd.hse_kra.responsibilities || [],
        kras: jd.hse_kra.kras || [],
      });
    }

    await supabase.from("job_analyses").update({
      analysis_result: analysisMarkdown,
      jd_data: jd,
      status: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", analysisId);

    if (!record.admin_notified) {
      supabase.functions.invoke("notify-admin", { body: { analysisId } }).catch((e) => console.error("notify-admin error:", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-job error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

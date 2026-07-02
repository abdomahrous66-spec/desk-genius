import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import competenciesData from "./data/competencies.json" with { type: "json" };
import { callGemini, parseJsonLoose } from "../_shared/gemini.ts";

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
  for (const k of Object.keys(COMPS)) if (norm(k) === t) return COMPS[k];
  for (const k of Object.keys(COMPS)) {
    const nk = norm(k);
    if (nk.includes(t) || t.includes(nk)) return COMPS[k];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { analysisId } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: record, error: fetchErr } = await supabase
      .from("job_analyses").select("*").eq("id", analysisId).single();
    if (fetchErr || !record) throw new Error("Analysis record not found");

    // Owner or admin only
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", callerId).maybeSingle();
    const isAdmin = roleRow?.role === "admin";
    if (record.user_id !== callerId && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = record.raw_input as Record<string, unknown>;
    const matched = lookupComps(record.job_title);
    const compHint = matched
      ? `MATCHED COMPETENCIES from company database (use EXACT names):
- core: ${(matched.core || []).join(", ") || "(none — pick 3-5 standard core)"}
- functional: ${(matched.functional || []).join(", ") || "(none — pick 3-6 role-specific)"}
- leadership: ${(matched.leadership || []).join(", ") || "(none — pick 3-5 if managerial else [])"}`
      : "No exact competency match. Pick standard names from common HR frameworks.";

    const pdInput = (input.position_dimensions_input as Record<string, string>) || {};
    const reportsInput = (input.reports_input as Array<Record<string, string>>) || [];
    const outputLang = (input.output_language as string) || "en";

    const today = new Date().toISOString().slice(0, 10);
    const langInstr = outputLang === "ar" ? "Modern Standard Arabic (professional, formal)" : "Professional English";

    const userPrompt = `You are an expert HR consultant for Nahdet Misr Publishing Group. Fill any missing details with industry-standard professional content. OUTPUT LANGUAGE for both analysis_markdown and jd: ${langInstr}.

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

Manager-provided REPORTS:
${JSON.stringify(reportsInput, null, 2)}
- If the list above is empty OR every row is "N/A", GENERATE 2-4 realistic reports typical for this role (name, frequency, purpose, presented_to). Do NOT leave reports as [].

Manager-provided POSITION DIMENSIONS (if "N/A" or missing, INFER from role seniority & context — do not return ["N/A"] unless the role truly has no authority at all, e.g. junior IC roles where financial/hiring authority is genuinely nil; even then write a short realistic bullet like ["No direct financial authority"]):
- level_of_authority: ${pdInput.level_of_authority || "N/A — infer 2-4 bullets from role seniority"}
- financial_control: ${pdInput.financial_control || "N/A — infer or write realistic 'No direct budget authority' style bullet"}
- annual_amount: ${pdInput.annual_amount || "N/A — infer approx budget scope if managerial, else ['N/A']"}
- hiring_promotion_authority: ${pdInput.hiring_promotion_authority || "N/A — infer (e.g. 'Recommends hiring decisions to manager') for non-managers"}

${compHint}

Today: ${today}

Return ONLY a valid JSON object (no markdown fences, no commentary) with exactly these two top-level keys:
{
  "analysis_markdown": "Full Job Analysis as markdown text in ${langInstr}",
  "jd": {
    "position_title": "...", "sector": "...", "reporting_to": "...", "department": "...",
    "location": "${input.location || "Borg"}",
    "no_of_direct_reports": "...", "last_update": "${today}",
    "no_of_total_subordinate": "...", "version_number": "1.0",
    "type_of_employment": "Full-Time",
    "main_job_purpose": "...",
    "key_result_areas": [{"area":"...","responsibilities":["..."],"kras":["..."]}],
    "hse_kra": {"responsibilities":["..."],"kras":["..."]},
    "internal_communication": ["..."],
    "external_communication": ["..."],
    "work_environment": {"indoor":"...","outdoor":"...","working_hazards":"...","working_days":"...","days_off":"...","working_hours":"..."},
    "reports": [{"report_name":"...","frequency":"...","report_purpose":"...","presented_to":"..."}],
    "reporting_structure": "...",
    "kpis": [{"kpi":"...","measurement":"...","target":"..."}],
    "position_dimensions": {"level_of_authority":["..."],"financial_control":["..."],"annual_amount":["..."],"hiring_promotion_authority":["..."]},
    "qualifications": {"education":["..."],"experience":["..."],"computer_skills":["..."],"language_skills":["..."],"core_competencies":["..."],"functional_competencies":["..."],"leadership_competencies":["..."]},
    "structure_boxes": {"manager":"...","position":"...","subordinates":["..."]}
  }
}

CRITICAL RULES:
- "location": exactly "${input.location || "Borg"}".
- "reports": if manager list is non-empty and not all N/A, use it EXACTLY. If empty or all N/A, GENERATE 2-4 realistic reports for this role — NEVER return [].
- "position_dimensions": ALWAYS populate all 4 keys with realistic bullets. Infer from role seniority when manager didn't provide. Non-managerial roles get realistic limited-authority bullets (e.g. ["Executes tasks within defined SOPs", "No direct budget authority"]) — do NOT return ["N/A"] except when truly impossible.
- "structure_boxes": ALWAYS populate. manager = Reports-To title, position = job title, subordinates = list.
- "key_result_areas": 5-8 KRAs (each 4-8 responsibilities, 3-6 KRAs).
- "hse_kra": MANDATORY. Health/Safety/Environment block (4-7 responsibilities + 3-5 KRAs).
- Competencies: use MATCHED names exactly when provided. NAMES ONLY, no indicators.
- "kpis": only if manager provided; else [].
- ALL text content in ${langInstr}.`;

    let aiText: string;
    try {
      aiText = await callGemini({
        system: "You are an expert HR consultant. Always return ONLY valid JSON matching the requested shape — no markdown fences, no commentary.",
        user: userPrompt,
        json: true,
        temperature: 0.4,
        model: "gemini-2.0-flash",
      });
    } catch (aiErr) {
      const msg = aiErr instanceof Error ? aiErr.message : "خطأ في خدمة الـ AI";
      console.error("Gemini error:", msg);
      await supabase.from("job_analyses").update({ status: "error", analysis_result: msg }).eq("id", analysisId);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const parsed = parseJsonLoose<{ analysis_markdown: string; jd: Record<string, unknown> }>(aiText);

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

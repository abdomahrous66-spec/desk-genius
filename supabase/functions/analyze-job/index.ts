import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysisId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: record, error: fetchErr } = await supabase
      .from("job_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    if (fetchErr || !record) throw new Error("Analysis record not found");

    const input = record.raw_input as Record<string, string>;

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
            additionalProperties: false,
          },
        },
        internal_communication: { type: "array", items: { type: "string" } },
        external_communication: { type: "array", items: { type: "string" } },
        work_environment: {
          type: "object",
          properties: {
            indoor: { type: "string" },
            outdoor: { type: "string" },
            working_hazards: { type: "string" },
            working_days: { type: "string" },
            days_off: { type: "string" },
            working_hours: { type: "string" },
          },
          required: ["indoor", "outdoor", "working_hazards", "working_days", "days_off", "working_hours"],
          additionalProperties: false,
        },
        reports: {
          type: "array",
          items: {
            type: "object",
            properties: {
              report_name: { type: "string" },
              frequency: { type: "string" },
              report_purpose: { type: "string" },
              presented_to: { type: "string" },
            },
            required: ["report_name", "frequency", "report_purpose", "presented_to"],
            additionalProperties: false,
          },
        },
        reporting_structure: { type: "string" },
        kpis: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kpi: { type: "string" },
              measurement: { type: "string" },
              target: { type: "string" },
            },
            required: ["kpi", "measurement", "target"],
            additionalProperties: false,
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
          additionalProperties: false,
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
          additionalProperties: false,
        },
        hse_requirements: { type: "array", items: { type: "string" } },
        structure_boxes: {
          type: "object",
          properties: {
            manager: { type: "string" },
            position: { type: "string" },
            subordinates: { type: "array", items: { type: "string" } },
          },
          required: ["manager", "position", "subordinates"],
          additionalProperties: false,
        },
      },
      required: [
        "position_title", "sector", "reporting_to", "department", "location",
        "no_of_direct_reports", "last_update", "no_of_total_subordinate",
        "version_number", "type_of_employment", "main_job_purpose",
        "key_result_areas", "internal_communication", "external_communication",
        "work_environment", "reports", "position_dimensions", "qualifications",
        "reporting_structure", "kpis", "hse_requirements", "structure_boxes",
      ],
      additionalProperties: false,
    };

    const today = new Date().toISOString().slice(0, 10);

    const userPrompt = `You are an expert HR consultant for Nahdet Misr Publishing Group. The manager submitted partial information about a job. Use your professional expertise to fill all gaps with reasonable, industry-standard content.

Manager input:
- Job Title: ${record.job_title}
- Sector: ${input.sector || "(infer)"}
- Department: ${record.department || "(infer)"}
- Location (REQUIRED, use exactly): ${input.location || "Borg"}
- Purpose: ${input.purpose || "(infer)"}
- Tasks & Responsibilities (split intelligently into Responsibilities and KRAs): ${input.tasks || input.responsibilities || "(infer)"}
- Qualifications (extract Education, Experience, Computer Skills, Language Skills): ${input.qualifications || "(infer)"}
- Working Conditions + Internal/External Communication: ${input.workingConditions || "(infer)"}
- Reports To (direct manager title): ${input.reportsTo || "(infer based on seniority)"}
- Direct Subordinates (titles, one per line): ${input.directReports || "(infer 3-6 reasonable subordinates based on seniority, or [] for IC roles)"}
- KPIs (if empty, return []. DO NOT invent KPIs): ${input.kpis || "(EMPTY - return [])"}
- Notes: ${input.notes || "None"}

Today's date: ${today}

Call "save_job_outputs" with:
1) "analysis_markdown": Complete English Job Analysis markdown.
2) "jd": Full Job Description matching the schema.

CRITICAL RULES:
- "location": exactly "${input.location || "Borg"}".
- "structure_boxes": ALWAYS populate. manager = Reports-To title, position = job title, subordinates = array of subordinate titles (infer 3-6 if not given, or [] for IC).
- "reporting_structure": text backup like "Manager: <X>\\nPosition: <Y>\\nSubordinates: <a>, <b>".
- "hse_requirements": ALWAYS auto-generate 4-7 professional HSE items (compliance with HSE policies, attending safety trainings, incident reporting, PPE, ergonomics, etc.) — even if not requested.
- Competencies split into THREE arrays (NAMES ONLY, no descriptions):
  * core_competencies: 3-5 (Agility, Customer Focus, Work Efficiency, Integrity, Teamwork...)
  * functional_competencies: 3-6 SPECIFIC to the role
  * leadership_competencies: 3-5 if role manages people, else []
- 5-8 Key Result Areas (each 4-8 responsibilities, 3-6 KRAs).
- 4-8 reports.
- "kpis": only if manager provided; else [].
- last_update = today. version_number = "1.0". type_of_employment = "Full-Time".
- All output professional English.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are an expert HR consultant. Always call the provided tool with thorough, professional English content." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_job_outputs",
              description: "Save the Job Analysis markdown and structured Job Description.",
              parameters: {
                type: "object",
                properties: {
                  analysis_markdown: { type: "string" },
                  jd: jdSchema,
                },
                required: ["analysis_markdown", "jd"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_job_outputs" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      const status = aiResponse.status;
      const msg = status === 429 ? "Rate limit exceeded" : status === 402 ? "AI credits exhausted" : "AI gateway error";
      await supabase.from("job_analyses").update({ status: "error", analysis_result: msg }).eq("id", analysisId);
      return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return tool call");

    const args = JSON.parse(toolCall.function.arguments);
    const analysisMarkdown: string = args.analysis_markdown;
    const jd = args.jd;

    await supabase
      .from("job_analyses")
      .update({
        analysis_result: analysisMarkdown,
        jd_data: jd,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    // Notify admin (fire and forget)
    if (!record.admin_notified) {
      supabase.functions.invoke("notify-admin", { body: { analysisId } }).catch((e) => console.error("notify-admin error:", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-job error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

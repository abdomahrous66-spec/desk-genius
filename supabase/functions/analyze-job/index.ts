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
            competency: { type: "array", items: { type: "string" } },
          },
          required: ["education", "experience", "computer_skills", "language_skills", "competency"],
          additionalProperties: false,
        },
      },
      required: [
        "position_title", "sector", "reporting_to", "department", "location",
        "no_of_direct_reports", "last_update", "no_of_total_subordinate",
        "version_number", "type_of_employment", "main_job_purpose",
        "key_result_areas", "internal_communication", "external_communication",
        "work_environment", "reports", "position_dimensions", "qualifications",
      ],
      additionalProperties: false,
    };

    const today = new Date().toISOString().slice(0, 10);

    const userPrompt = `You are an expert HR consultant. The manager submitted partial information about a job. Use your professional expertise to fill all gaps with reasonable, industry-standard content. Produce BOTH a Job Analysis (markdown) AND a structured Job Description matching the company template.

Manager input:
- Job Title: ${record.job_title}
- Department: ${record.department || "(infer)"}
- Manager Name: ${record.manager_name || "(not provided)"}
- Purpose: ${input.purpose || "(infer)"}
- Tasks: ${input.tasks || "(infer)"}
- Responsibilities: ${input.responsibilities || "(infer)"}
- Skills: ${input.skills || "(infer)"}
- Qualifications: ${input.qualifications || "(infer)"}
- Working Conditions: ${input.workingConditions || "(infer)"}
- Reports To: ${input.reportsTo || "(infer)"}
- KPIs: ${input.kpis || "(infer)"}
- Notes: ${input.notes || "None"}

Today's date: ${today}

You MUST call the tool "save_job_outputs" exactly once with:
1) "analysis_markdown": A complete English Job Analysis in markdown with sections: Job Identification, Job Purpose, Key Duties, Essential Tasks, KSAs, Qualifications, Working Conditions, Reporting Relationships, KPIs, Competency Framework.
2) "jd": A fully populated Job Description object matching the schema. Be thorough — include 5–8 Key Result Areas (each with 4–8 responsibilities and 3–6 KRAs), 4–8 reports, realistic work environment values, and complete qualifications. Use today's date for last_update. Default version_number to "1.0". Default type_of_employment to "Full-Time" unless otherwise indicated.`;

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

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

    const userPrompt = `You are an expert HR consultant specializing in Job Analysis. The manager has provided the following information about a position (some fields may be empty or partial — use your expertise to fill gaps reasonably based on industry standards and the context provided):

Job Title: ${record.job_title}
Department: ${record.department || "Not specified"}
Manager Name: ${record.manager_name || "Not specified"}

Job Purpose / Summary: ${input.purpose || "(not provided — infer from job title)"}

Key Tasks & Activities: ${input.tasks || "(not provided — infer typical tasks for this role)"}

Responsibilities: ${input.responsibilities || "(not provided — infer)"}

Required Skills: ${input.skills || "(not provided — infer)"}

Required Qualifications & Experience: ${input.qualifications || "(not provided — infer)"}

Working Conditions: ${input.workingConditions || "(not provided — infer)"}

Reports To: ${input.reportsTo || "(not provided)"}

Performance Indicators (KPIs): ${input.kpis || "(not provided — suggest appropriate KPIs)"}

Additional Notes from Manager: ${input.notes || "None"}

Produce a complete, professional Job Analysis document in ENGLISH with the following sections (use clear markdown headings):

# Job Analysis: ${record.job_title}

## 1. Job Identification
## 2. Job Purpose / Summary
## 3. Key Duties and Responsibilities
## 4. Essential Tasks (detailed list)
## 5. Required Knowledge, Skills, and Abilities (KSAs)
## 6. Qualifications and Experience
## 7. Physical & Working Conditions
## 8. Reporting Relationships
## 9. Key Performance Indicators (KPIs)
## 10. Competency Framework

Where the manager left blanks, use your professional judgment to suggest reasonable content based on the job title and context. Mark inferred items clearly with "(suggested)". Be thorough, structured, and practical.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert HR consultant who creates detailed, professional Job Analysis documents. Always respond in English with well-structured markdown." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        await supabase.from("job_analyses").update({ status: "error", analysis_result: "Rate limit exceeded. Please try again later." }).eq("id", analysisId);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        await supabase.from("job_analyses").update({ status: "error", analysis_result: "AI credits exhausted." }).eq("id", analysisId);
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const result = aiData.choices?.[0]?.message?.content || "No analysis generated.";

    await supabase
      .from("job_analyses")
      .update({ analysis_result: result, status: "completed", updated_at: new Date().toISOString() })
      .eq("id", analysisId);

    return new Response(JSON.stringify({ success: true, result }), {
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

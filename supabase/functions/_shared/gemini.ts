// AI helper — prefers Lovable AI Gateway (free Gemini) and falls back to
// direct Google Generative Language API when a GOOGLE_GEMINI_API_KEY is set.

type Opts = {
  system?: string;
  user: string;
  json?: boolean;
  model?: string;
  temperature?: number;
};

async function callLovableGateway(opts: Opts): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  // Map free Gemini model names
  const model = (opts.model && opts.model.startsWith("google/"))
    ? opts.model
    : "google/gemini-2.5-flash";

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.json) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Lovable AI error:", res.status, t);
    throw new Error(`LovableAI ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Lovable AI returned empty content");
  return text;
}

async function callGoogleDirect(opts: Opts): Promise<string> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY missing");
  const model = opts.model && !opts.model.startsWith("google/") ? opts.model : "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Gemini direct error:", res.status, t);
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

export async function callGemini(opts: Opts): Promise<string> {
  const hasLovable = !!Deno.env.get("LOVABLE_API_KEY");
  const hasGoogle = !!Deno.env.get("GOOGLE_GEMINI_API_KEY");

  // Prefer Lovable AI Gateway (free Gemini, higher quotas)
  if (hasLovable) {
    try {
      return await callLovableGateway(opts);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fallback to direct Google if Lovable rate-limited / errored and Google key is set
      if (hasGoogle && (msg.includes("429") || msg.includes("402") || msg.includes("503"))) {
        console.warn("Falling back to Google direct due to:", msg);
        return await callGoogleDirect(opts);
      }
      throw e;
    }
  }
  return await callGoogleDirect(opts);
}

export function parseJsonLoose<T = unknown>(text: string): T {
  try { return JSON.parse(text) as T; } catch { /* fallthrough */ }
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(clean) as T;
}

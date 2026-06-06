// Direct Google Gemini API helper — uses the FREE tier via GOOGLE_GEMINI_API_KEY
// (1500 requests/day free, no Lovable AI credit consumption)

export async function callGemini(opts: {
  system?: string;
  user: string;
  json?: boolean;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const key = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!key) throw new Error("GOOGLE_GEMINI_API_KEY missing");
  const model = opts.model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Gemini error:", res.status, t);
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

export function parseJsonLoose<T = unknown>(text: string): T {
  try { return JSON.parse(text) as T; } catch { /* fallthrough */ }
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(clean) as T;
}

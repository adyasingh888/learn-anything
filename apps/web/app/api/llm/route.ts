/**
 * LLM proxy — tries in order:
 * 1. OpenAI-compatible cloud (LLM_API_KEY)
 * 2. Ollama (OLLAMA_BASE_URL) — free local models, no key
 * 3. { fallback: true } → client uses on-device heuristic tutor
 *
 * Ollama env:
 *   OLLAMA_BASE_URL=http://127.0.0.1:11434
 *   OLLAMA_MODEL=llama3.2
 */
export const runtime = "nodejs";

interface Body {
  messages: { role: string; content: string }[];
  json?: boolean;
  prefer?: "cloud" | "ollama" | "auto";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const prefer = body.prefer ?? "auto";

  if (prefer !== "ollama") {
    const cloud = await tryCloud(body);
    if (cloud) return Response.json({ text: cloud, provider: "cloud" });
  }

  if (prefer !== "cloud") {
    const ollama = await tryOllama(body);
    if (ollama) return Response.json({ text: ollama, provider: "ollama" });
  }

  return Response.json({ fallback: true });
}

async function tryCloud(body: Body): Promise<string | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        temperature: 0.3,
        response_format: body.json ? { type: "json_object" } : undefined,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function tryOllama(body: Body): Promise<string | null> {
  const base = process.env.OLLAMA_BASE_URL;
  if (!base) return null;
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: body.messages,
        stream: false,
        options: { temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? null;
  } catch {
    return null;
  }
}

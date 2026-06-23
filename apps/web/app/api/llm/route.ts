/**
 * LLM proxy. If an OpenAI-compatible provider is configured via env, calls it
 * with a no-retention request; otherwise returns { fallback: true } so the
 * client uses the offline HeuristicProvider. Set:
 *   LLM_BASE_URL (default https://api.openai.com/v1)
 *   LLM_API_KEY
 *   LLM_MODEL (default gpt-4o-mini)
 */
export const runtime = "nodejs";

interface Body {
  messages: { role: string; content: string }[];
  json?: boolean;
}

export async function POST(req: Request) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return Response.json({ fallback: true });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Signal zero-retention where the provider supports it.
        "OpenAI-Beta": "no-retention",
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        temperature: 0.3,
        response_format: body.json ? { type: "json_object" } : undefined,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return Response.json({ fallback: true });
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return Response.json({ text });
  } catch {
    return Response.json({ fallback: true });
  }
}

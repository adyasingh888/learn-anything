/**
 * LLM-powered flashcard generation when API key is set; falls back to improved heuristics.
 */
export const runtime = "nodejs";

import { generateFlashcardsHeuristic, type BloomLevel } from "@learn-anything/core";

interface Body {
  text: string;
  title: string;
  brainId: string;
  sourceId: string;
  bloomTargets?: BloomLevel[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const { text, title, brainId, sourceId, bloomTargets } = body;
  const apiKey = process.env.LLM_API_KEY;

  if (apiKey && text.length > 80) {
    try {
      const cards = await generateWithLlm(text, title, apiKey);
      if (cards.length > 0) {
        return Response.json({
          cards: cards.map((c) => ({
            ...c,
            brainId,
            sourceIds: [sourceId],
          })),
          source: "llm",
        });
      }
    } catch {
      /* fall through */
    }
  }

  const cards = generateFlashcardsHeuristic(text, {
    brainId,
    sourceIds: [sourceId],
    maxCards: 12,
    bloomTargets,
  });
  return Response.json({ cards, source: "heuristic" });
}

async function generateWithLlm(
  text: string,
  title: string,
  apiKey: string,
): Promise<{ kind: string; bloom: string; front: string; back: string }[]> {
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  const excerpt = text.slice(0, 6000);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You create high-quality study flashcards from source material. Return JSON: { "cards": [{ "kind": "qa"|"cloze"|"teach-back", "bloom": "remember"|"understand"|"apply"|"analyze", "front": "...", "back": "..." }] }. Rules:
- 6-10 cards, grounded ONLY in the text
- Mix: definitions, why/how, teach-back ("Explain X in your own words")
- Front = question/prompt; back = concise answer from the text
- No generic filler cards`,
        },
        {
          role: "user",
          content: `Source: ${title}\n\n${excerpt}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) throw new Error("llm failed");
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { cards?: { kind: string; bloom: string; front: string; back: string }[] };
  return parsed.cards ?? [];
}

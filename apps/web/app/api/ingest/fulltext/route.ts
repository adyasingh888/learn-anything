/**
 * Fetch full text from a URL (PDF, article) via Jina Reader — free tier.
 */
export const runtime = "nodejs";

import { fetchArticleMarkdown } from "@/lib/integrations/jina";

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.url) return Response.json({ error: "url required" }, { status: 400 });

  const result = await fetchArticleMarkdown(body.url);
  if (!result || result.text.length < 80) {
    return Response.json({ error: "could not extract text" }, { status: 422 });
  }
  return Response.json({ title: result.title, text: result.text, meta: { fullText: true } });
}

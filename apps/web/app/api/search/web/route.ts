import { searchWeb } from "@/lib/integrations/jina";

export const runtime = "nodejs";

/** Free web search via Jina Search — finds pages to capture next. No API key required. */
export async function POST(req: Request) {
  let query: string;
  try {
    ({ query } = (await req.json()) as { query: string });
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!query?.trim()) return Response.json({ error: "query required" }, { status: 400 });

  try {
    const results = await searchWeb(query.trim());
    return Response.json({ results, source: "jina-search" });
  } catch {
    return Response.json({ results: [], error: "search failed" }, { status: 502 });
  }
}

import { recommendFromSeedTitles, searchPapers } from "@/lib/integrations/semantic-scholar";

export const runtime = "nodejs";

interface Body {
  query?: string;
  seedTitles?: string[];
  excludeTitles?: string[];
  limit?: number;
}

/** Search Semantic Scholar for papers outside the user's library. No API key required. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const limit = Math.min(body.limit ?? 6, 10);
  const exclude = body.excludeTitles ?? [];

  try {
    let papers;
    if (body.query) {
      papers = await searchPapers(body.query, limit + exclude.length);
      const ex = new Set(exclude.map((t) => t.toLowerCase()));
      papers = papers.filter((p) => !ex.has(p.title.toLowerCase())).slice(0, limit);
    } else if (body.seedTitles?.length) {
      papers = await recommendFromSeedTitles(body.seedTitles, exclude, limit);
    } else {
      return Response.json({ error: "query or seedTitles required" }, { status: 400 });
    }
    return Response.json({ papers, source: "semantic-scholar" });
  } catch {
    return Response.json({ papers: [], error: "search failed" }, { status: 502 });
  }
}

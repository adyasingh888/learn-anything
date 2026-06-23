import { searchArxiv } from "@/lib/integrations/arxiv";
import { searchOpenAlex } from "@/lib/integrations/openalex";
import type { PaperRecord } from "@/lib/integrations/paper-types";
import { recommendFromSeedTitles, searchPapers as searchSemanticScholar } from "@/lib/integrations/semantic-scholar";

export const runtime = "nodejs";

interface Body {
  query?: string;
  seedTitles?: string[];
  excludeTitles?: string[];
  limit?: number;
}

/** Multi-source paper search: Semantic Scholar + OpenAlex + arXiv. All free. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const limit = Math.min(body.limit ?? 6, 12);
  const exclude = new Set((body.excludeTitles ?? []).map((t) => t.toLowerCase().trim()));
  const query =
    body.query ??
    (body.seedTitles?.[0] ? body.seedTitles[0].slice(0, 120) : "");

  if (!query) return Response.json({ error: "query or seedTitles required" }, { status: 400 });

  try {
    const [s2, oa, ax] = await Promise.all([
      body.seedTitles?.length
        ? recommendFromSeedTitles(body.seedTitles, body.excludeTitles ?? [], limit + 4)
        : searchSemanticScholar(query, limit + 4),
      searchOpenAlex(query, limit + 2),
      searchArxiv(query, 4),
    ]);

    const merged = dedupePapers([...mapS2(s2), ...oa, ...ax])
      .filter((p) => !exclude.has(p.title.toLowerCase().trim()))
      .slice(0, limit);

    return Response.json({ papers: merged, sources: ["semantic-scholar", "openalex", "arxiv"] });
  } catch {
    return Response.json({ papers: [], error: "search failed" }, { status: 502 });
  }
}

function mapS2(
  papers: Awaited<ReturnType<typeof searchSemanticScholar>>,
): PaperRecord[] {
  return papers.map((p) => ({
    id: `s2:${p.paperId}`,
    title: p.title,
    abstract: p.abstract,
    year: p.year,
    citationCount: p.citationCount,
    url: p.url,
    authors: p.authors,
    openAccessPdf: p.openAccessPdf,
    venue: p.venue,
    source: "semantic-scholar" as const,
  }));
}

function dedupePapers(papers: PaperRecord[]): PaperRecord[] {
  const seen = new Set<string>();
  const out: PaperRecord[] = [];
  for (const p of papers) {
    const key = p.title.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

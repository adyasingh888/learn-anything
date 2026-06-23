/**
 * Semantic Scholar — free academic search, no API key required.
 * https://api.semanticscholar.org/
 */

export interface ScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  url?: string;
  authors?: string[];
  openAccessPdf?: string;
  venue?: string;
}

interface SearchResponse {
  data?: Array<{
    paperId: string;
    title: string;
    abstract?: string;
    year?: number;
    citationCount?: number;
    url?: string;
    venue?: string;
    authors?: { name: string }[];
    openAccessPdf?: { url: string };
    externalIds?: { DOI?: string; ArXiv?: string };
  }>;
}

const FIELDS =
  "title,abstract,year,citationCount,url,authors,openAccessPdf,venue,externalIds";

export async function searchPapers(query: string, limit = 8): Promise<ScholarPaper[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "LearnAnything/0.1 (https://learn-anything-silk.vercel.app)",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as SearchResponse;
  return (json.data ?? []).map(mapPaper);
}

export async function recommendFromSeedTitles(
  seedTitles: string[],
  excludeTitles: string[] = [],
  limit = 6,
): Promise<ScholarPaper[]> {
  if (!seedTitles.length) return [];
  // Use the first seed title as a relevance search, then filter out captures.
  const query = seedTitles[0].slice(0, 120);
  const papers = await searchPapers(query, limit + excludeTitles.length + 4);
  const exclude = new Set(excludeTitles.map((t) => t.toLowerCase().trim()));
  return papers
    .filter((p) => !exclude.has(p.title.toLowerCase().trim()))
    .slice(0, limit);
}

function mapPaper(p: NonNullable<SearchResponse["data"]>[number]): ScholarPaper {
  return {
    paperId: p.paperId,
    title: p.title,
    abstract: p.abstract,
    year: p.year,
    citationCount: p.citationCount,
    url: p.url ?? (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : undefined),
    authors: p.authors?.map((a) => a.name),
    openAccessPdf: p.openAccessPdf?.url,
    venue: p.venue,
  };
}

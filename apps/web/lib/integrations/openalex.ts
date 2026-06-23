/**
 * OpenAlex — free scholarly catalog (optional OPENALEX_API_KEY for higher limits).
 * https://docs.openalex.org/
 */

import type { PaperRecord } from "./paper-types";

export async function searchOpenAlex(query: string, limit = 6): Promise<PaperRecord[]> {
  const apiKey = process.env.OPENALEX_API_KEY;
  const params = new URLSearchParams({
    search: query,
    per_page: String(Math.min(limit, 10)),
    select: "id,title,abstract_inverted_index,publication_year,cited_by_count,doi,authorships,primary_location,open_access",
  });
  if (apiKey) params.set("api_key", apiKey);

  try {
    const res = await fetch(`https://api.openalex.org/works?${params}`, {
      headers: { "User-Agent": "LearnAnything/0.1 (https://learn-anything-silk.vercel.app)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: OpenAlexWork[] };
    return (json.results ?? []).map(mapWork);
  } catch {
    return [];
  }
}

function mapWork(w: OpenAlexWork): PaperRecord {
  const id = w.id?.replace("https://openalex.org/", "") ?? w.doi ?? "unknown";
  return {
    id: `openalex:${id}`,
    title: w.title ?? "Untitled",
    abstract: invertedIndexToText(w.abstract_inverted_index),
    year: w.publication_year ?? undefined,
    citationCount: w.cited_by_count,
    url: w.doi ? `https://doi.org/${w.doi.replace("https://doi.org/", "")}` : w.primary_location?.landing_page_url,
    openAccessPdf: w.open_access?.oa_url,
    authors: w.authorships?.map((a) => a.author?.display_name).filter(Boolean) as string[],
    venue: w.primary_location?.source?.display_name,
    doi: w.doi?.replace("https://doi.org/", ""),
    source: "openalex",
  };
}

function invertedIndexToText(idx?: Record<string, number[]>): string | undefined {
  if (!idx) return undefined;
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map((w) => w[1]).join(" ") || undefined;
}

interface OpenAlexWork {
  id?: string;
  title?: string;
  abstract_inverted_index?: Record<string, number[]>;
  publication_year?: number | null;
  cited_by_count?: number;
  doi?: string;
  authorships?: { author?: { display_name?: string } }[];
  primary_location?: { landing_page_url?: string; source?: { display_name?: string } };
  open_access?: { oa_url?: string };
}

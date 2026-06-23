/**
 * Crossref — free DOI metadata (polite pool, no key).
 * https://www.crossref.org/documentation/retrieve-metadata/rest-api/
 */

import type { PaperRecord } from "./paper-types";

const UA = "LearnAnything/0.1 (https://learn-anything-silk.vercel.app; mailto:support@learn-anything.app)";

export async function fetchByDoi(doi: string): Promise<PaperRecord | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { message?: CrossrefWork };
    const m = json.message;
    if (!m?.title?.[0]) return null;
    return {
      id: `crossref:${doi}`,
      title: m.title[0],
      abstract: m.abstract?.replace(/<[^>]+>/g, "") ?? undefined,
      year: m.published?.["date-parts"]?.[0]?.[0],
      url: m.URL ?? `https://doi.org/${doi}`,
      authors: m.author?.map((a) => [a.given, a.family].filter(Boolean).join(" ")),
      venue: m["container-title"]?.[0],
      doi,
      source: "crossref",
    };
  } catch {
    return null;
  }
}

export function crossrefToCaptureText(p: PaperRecord): string {
  return [
    p.title,
    p.authors?.length ? `Authors: ${p.authors.join("; ")}` : "",
    p.venue ? `Published in: ${p.venue}` : "",
    p.year ? `Year: ${p.year}` : "",
    p.doi ? `DOI: ${p.doi}` : "",
    "",
    p.abstract ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

interface CrossrefWork {
  title?: string[];
  abstract?: string;
  author?: { given?: string; family?: string }[];
  published?: { "date-parts"?: number[][] };
  URL?: string;
  "container-title"?: string[];
}

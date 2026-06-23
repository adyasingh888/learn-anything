/**
 * arXiv — free API for preprints (no key).
 * http://export.arxiv.org/api/query
 */

import type { PaperRecord } from "./paper-types";

export async function fetchByArxivId(id: string): Promise<PaperRecord | null> {
  const clean = id.replace(/^arxiv:/i, "").replace(/v\d+$/, "");
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(clean)}&max_results=1`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const xml = await res.text();
    return parseArxivAtom(xml, clean);
  } catch {
    return null;
  }
}

export async function searchArxiv(query: string, limit = 5): Promise<PaperRecord[]> {
  try {
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return parseArxivFeed(xml);
  } catch {
    return [];
  }
}

function parseArxivFeed(xml: string): PaperRecord[] {
  const entries = xml.split("<entry>").slice(1);
  return entries.map((e) => parseEntry(e)).filter(Boolean) as PaperRecord[];
}

function parseArxivAtom(xml: string, id: string): PaperRecord | null {
  const entry = xml.includes("<entry>") ? xml.split("<entry>")[1] : xml;
  return parseEntry(entry, id);
}

function parseEntry(entry: string, fallbackId?: string): PaperRecord | null {
  const title = tag(entry, "title")?.replace(/\s+/g, " ").trim();
  if (!title) return null;
  const summary = tag(entry, "summary")?.replace(/\s+/g, " ").trim();
  const idUrl = tag(entry, "id") ?? "";
  const arxivId = fallbackId ?? idUrl.match(/(\d{4}\.\d{4,5})/)?.[1] ?? idUrl;
  const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1].trim());
  const published = tag(entry, "published");
  const year = published ? parseInt(published.slice(0, 4), 10) : undefined;
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
  return {
    id: `arxiv:${arxivId}`,
    title,
    abstract: summary,
    year,
    url: `https://arxiv.org/abs/${arxivId}`,
    openAccessPdf: pdfUrl,
    authors,
    venue: "arXiv",
    source: "arxiv",
  };
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1].trim() : undefined;
}

export function arxivToCaptureText(p: PaperRecord): string {
  return [
    p.title,
    p.authors?.length ? `Authors: ${p.authors.join("; ")}` : "",
    p.venue ?? "arXiv preprint",
    p.year ? `Year: ${p.year}` : "",
    p.url ? `URL: ${p.url}` : "",
    "",
    p.abstract ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

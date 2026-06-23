/**
 * Minimal BibTeX parser for Zotero/export imports — no external deps.
 */

export interface BibEntry {
  key: string;
  type: string;
  title?: string;
  author?: string;
  year?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  journal?: string;
  booktitle?: string;
}

export function parseBibtex(raw: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const type = m[1].toLowerCase();
    const key = m[2];
    const body = m[3];
    const fields = parseFields(body);
    entries.push({
      key,
      type,
      title: cleanBibValue(fields.title),
      author: cleanBibValue(fields.author),
      year: cleanBibValue(fields.year),
      doi: cleanBibValue(fields.doi),
      url: cleanBibValue(fields.url),
      abstract: cleanBibValue(fields.abstract),
      journal: cleanBibValue(fields.journal),
      booktitle: cleanBibValue(fields.booktitle),
    });
  }
  return entries;
}

function parseFields(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const fieldRe = /(\w+)\s*=\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|"[^"]*"|[^,\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = fieldRe.exec(body))) {
    out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}

function cleanBibValue(v?: string): string | undefined {
  if (!v) return undefined;
  let s = v.trim();
  if (s.startsWith("{") && s.endsWith("}")) s = s.slice(1, -1);
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
  return s.replace(/\s+/g, " ").replace(/\\_/g, "_").trim() || undefined;
}

/** Turn a BibTeX entry into capture-ready plain text. */
export function bibEntryToText(e: BibEntry): string {
  return [
    e.title,
    e.author ? `Authors: ${e.author.replace(/\s+and\s+/gi, "; ")}` : "",
    e.journal ? `Journal: ${e.journal}` : e.booktitle ? `In: ${e.booktitle}` : "",
    e.year ? `Year: ${e.year}` : "",
    e.doi ? `DOI: ${e.doi}` : "",
    "",
    e.abstract ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

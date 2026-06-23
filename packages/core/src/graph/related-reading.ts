/**
 * Suggest papers and articles OUTSIDE the user's library — scholar search links
 * and reading queries derived from concepts in the brain.
 */
import { extractKeyphrases } from "../ingest/index.js";

export interface RelatedReading {
  title: string;
  query: string;
  scholarUrl: string;
  semanticScholarUrl: string;
  reason: string;
}

export function scholarSearchUrl(query: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
}

export function semanticScholarUrl(query: string): string {
  return `https://www.semanticscholar.org/search?q=${encodeURIComponent(query)}&sort=relevance`;
}

/**
 * Build external reading suggestions from brain concepts + source titles.
 * Excludes queries that would just find the same article again.
 */
export function suggestRelatedReading(
  conceptLabels: string[],
  sourceTitles: string[],
  sourceTextSample = "",
  max = 6,
): RelatedReading[] {
  const fromConcepts = conceptLabels.filter((c) => c.length > 3);
  const fromText = extractKeyphrases(sourceTextSample, 10);
  const terms = [...new Set([...fromConcepts, ...fromText])].slice(0, 12);

  const excludeLower = sourceTitles.map((t) => t.toLowerCase());
  const out: RelatedReading[] = [];
  const seen = new Set<string>();

  // Pair top concepts → "X and Y" literature searches.
  for (let i = 0; i < terms.length && out.length < max; i++) {
    for (let j = i + 1; j < terms.length && out.length < max; j++) {
      const query = `${terms[i]} ${terms[j]} research`;
      if (seen.has(query) || isExcluded(query, excludeLower)) continue;
      seen.add(query);
      out.push({
        title: `${capitalize(terms[i])} × ${capitalize(terms[j])}`,
        query,
        scholarUrl: scholarSearchUrl(query),
        semanticScholarUrl: semanticScholarUrl(query),
        reason: "Papers connecting these two themes — not in your library yet",
      });
    }
  }

  // Single-concept deep dives.
  for (const term of terms) {
    if (out.length >= max) break;
    const query = `${term} systematic review OR survey`;
    if (seen.has(query) || isExcluded(query, excludeLower)) continue;
    seen.add(query);
    out.push({
      title: `Survey: ${capitalize(term)}`,
      query,
      scholarUrl: scholarSearchUrl(query),
      semanticScholarUrl: semanticScholarUrl(query),
      reason: "Overview papers to broaden beyond what you've captured",
    });
  }

  // Opposing / gap-finding query from top concept.
  if (terms[0] && out.length < max) {
    const query = `${terms[0]} criticism OR limitations OR debate`;
    if (!seen.has(query) && !isExcluded(query, excludeLower)) {
      out.push({
        title: `Critiques & debates: ${capitalize(terms[0])}`,
        query,
        scholarUrl: scholarSearchUrl(query),
        semanticScholarUrl: semanticScholarUrl(query),
        reason: "Find opposing views and gaps in the literature",
      });
    }
  }

  return out.slice(0, max);
}

function isExcluded(query: string, sourceTitles: string[]): boolean {
  const q = query.toLowerCase();
  return sourceTitles.some((t) => t.length > 8 && q.includes(t.slice(0, 20)));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Research domain — viva / oral defense question generator (offline).
 */
import type { Atom, Source } from "../types.js";
import { extractClaims } from "../research/claims.js";

export function generateVivaQuestions(atoms: Atom[], sources: Source[], limit = 8): string[] {
  const claims = extractClaims(atoms, sources);
  const qs: string[] = [];

  for (const c of claims.slice(0, 4)) {
    qs.push(`Defend the claim: "${c.claim}" — what evidence supports it?`);
    if (c.evidence.length) {
      qs.push(`How does "${c.evidence[0].title}" relate to your argument about ${c.claim}?`);
    }
  }

  if (sources.length >= 2) {
    qs.push(`Compare the methodologies in "${sources[0].title}" and "${sources[1].title}".`);
    qs.push(`Where do your sources disagree, and which do you find more convincing?`);
  }

  qs.push(
    "What is the single biggest gap in your current literature coverage?",
    "If a examiner challenged your central thesis, what would you say?",
    "Summarize your contribution in one sentence a non-expert would understand.",
  );

  return [...new Set(qs)].slice(0, limit);
}

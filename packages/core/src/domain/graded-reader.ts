/**
 * Graded reader — split sources into difficulty-tagged chunks (no LLM).
 */
import type { Source } from "../types.js";

export type ReadDifficulty = "easy" | "medium" | "hard";

export interface GradedChunk {
  sourceId: string;
  sourceTitle: string;
  text: string;
  difficulty: ReadDifficulty;
  wordCount: number;
}

const LONG_WORD = /\b[\p{L}]{10,}\b/gu;

export function buildGradedChunks(sources: Source[], maxPerSource = 6, maxTotal = 24): GradedChunk[] {
  const out: GradedChunk[] = [];

  for (const s of sources) {
    const sentences = s.text.split(/(?<=[.!?])\s+/).filter((x) => x.trim().length > 24);
    for (const sent of sentences.slice(0, maxPerSource)) {
      const wordCount = sent.split(/\s+/).length;
      const longHits = (sent.match(LONG_WORD) ?? []).length;
      const rareRatio = longHits / Math.max(wordCount, 1);
      let difficulty: ReadDifficulty = "easy";
      if (wordCount > 26 || rareRatio > 0.22) difficulty = "hard";
      else if (wordCount > 14 || rareRatio > 0.1) difficulty = "medium";

      out.push({
        sourceId: s.id,
        sourceTitle: s.title,
        text: sent.trim(),
        difficulty,
        wordCount,
      });
      if (out.length >= maxTotal) return out;
    }
  }

  return out.sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty));
}

function difficultyRank(d: ReadDifficulty): number {
  return d === "easy" ? 0 : d === "medium" ? 1 : 2;
}

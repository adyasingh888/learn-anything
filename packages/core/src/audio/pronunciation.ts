/**
 * Pronunciation scoring — token overlap + length penalty (offline).
 */
export interface PronunciationScore {
  score: number;
  summary: string;
  missed: string[];
  matched: string[];
}

export function scorePronunciation(spoken: string, expected: string): PronunciationScore {
  const expTokens = (expected.toLowerCase().match(/\p{L}+/gu) ?? []).filter((t) => t.length > 2);
  const spTokens = new Set((spoken.toLowerCase().match(/\p{L}+/gu) ?? []));

  if (!expTokens.length) {
    return { score: 0, summary: "No expected text", missed: [], matched: [] };
  }

  const matched: string[] = [];
  const missed: string[] = [];
  for (const t of expTokens) {
    if (spTokens.has(t)) matched.push(t);
    else missed.push(t);
  }

  const recall = matched.length / expTokens.length;
  const precision = spTokens.size ? matched.length / spTokens.size : 0;
  const score = clamp01(recall * 0.75 + precision * 0.25);

  const summary =
    score >= 0.8
      ? "Strong pronunciation match"
      : score >= 0.5
        ? "Partial — focus on missed words"
        : "Keep practicing — compare to model";

  return { score, summary, missed: missed.slice(0, 8), matched: matched.slice(0, 8) };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

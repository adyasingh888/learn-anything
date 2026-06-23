/**
 * Offline Feynman / teach-back grading — no LLM.
 */
import { tokenize } from "../embeddings/index.js";
import { extractKeyphrases } from "../ingest/index.js";

export interface TeachBackGrade {
  score: number;
  gotRight: string[];
  gaps: string[];
  question: string;
  summary: string;
}

export function gradeTeachBack(
  topic: string,
  explanation: string,
  context: string,
): TeachBackGrade {
  if (!explanation.trim()) {
    return {
      score: 0,
      gotRight: [],
      gaps: ["Write an explanation first."],
      question: `What is the core idea behind "${topic}"?`,
      summary: "No explanation provided.",
    };
  }

  const keys = extractKeyphrases(context || topic, 8);
  const expTokens = new Set(tokenize(explanation));
  const gotRight: string[] = [];
  const gaps: string[] = [];

  for (const k of keys) {
    const kt = tokenize(k);
    const hit = kt.filter((t) => expTokens.has(t)).length / Math.max(kt.length, 1);
    if (hit >= 0.5) gotRight.push(k);
    else gaps.push(k);
  }

  const contextOverlap = overlapSets(expTokens, new Set(tokenize(context)));
  const score = clamp01(gotRight.length / Math.max(keys.length, 1) * 0.6 + contextOverlap * 0.4);

  const question =
    gaps[0]
      ? `You didn't mention **${gaps[0]}** — how does it connect to ${topic}?`
      : `Can you give a concrete example of ${topic}?`;

  const summary = [
    score >= 0.7 ? "Strong teach-back — key ideas covered." : "Partial — some gaps remain.",
    gotRight.length ? `Covered: ${gotRight.slice(0, 4).join(", ")}` : "",
    gaps.length ? `Missing: ${gaps.slice(0, 3).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { score, gotRight, gaps, question, summary };
}

function overlapSets(a: Set<string>, b: Set<string>): number {
  if (b.size === 0) return 0;
  let hit = 0;
  for (const t of b) if (a.has(t)) hit++;
  return hit / b.size;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

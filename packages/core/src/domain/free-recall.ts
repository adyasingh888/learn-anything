/**
 * Free-recall grading — explain from memory without looking (offline).
 */
import { tokenize } from "../embeddings/index.js";
import { extractKeyphrases } from "../ingest/index.js";
import type { Atom, Concept } from "../types.js";

export interface FreeRecallGrade {
  score: number;
  covered: string[];
  missed: string[];
  prompt: string;
  summary: string;
}

export function pickRecallPrompt(atoms: Atom[], concepts: Concept[]): string {
  const concept = concepts[Math.floor(Math.random() * concepts.length)];
  if (concept) return `Explain **${concept.label}** from memory.`;
  const atom = atoms[Math.floor(Math.random() * atoms.length)];
  if (atom) return `What do you know about **${atom.title}**?`;
  return "Summarize the main ideas you've captured so far.";
}

export function gradeFreeRecall(
  prompt: string,
  answer: string,
  context: string,
): FreeRecallGrade {
  if (!answer.trim()) {
    return {
      score: 0,
      covered: [],
      missed: ["Write your recall first."],
      prompt,
      summary: "No answer provided.",
    };
  }

  const keys = extractKeyphrases(context || prompt, 10);
  const ansTokens = new Set(tokenize(answer));
  const covered: string[] = [];
  const missed: string[] = [];

  for (const k of keys) {
    const kt = tokenize(k);
    const hit = kt.filter((t) => ansTokens.has(t)).length / Math.max(kt.length, 1);
    if (hit >= 0.45) covered.push(k);
    else missed.push(k);
  }

  const overlap = overlapSets(ansTokens, new Set(tokenize(context)));
  const score = clamp01(covered.length / Math.max(keys.length, 1) * 0.65 + overlap * 0.35);

  const summary = [
    score >= 0.75 ? "Strong recall — key ideas present." : score >= 0.45 ? "Partial recall — review gaps." : "Weak — revisit sources.",
    covered.length ? `Hit: ${covered.slice(0, 5).join(", ")}` : "",
    missed.length ? `Missed: ${missed.slice(0, 4).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { score, covered, missed, prompt, summary };
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

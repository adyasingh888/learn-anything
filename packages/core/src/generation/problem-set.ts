/**
 * Procedural problem-set generator — worked examples + faded steps.
 */
import { chunkText, extractKeyphrases } from "../ingest/index.js";
import { newId, now } from "../ids.js";
import { newCardState } from "../srs/fsrs.js";
import type { Card, ID } from "../types.js";

export function generateProblemSet(brainId: string, text: string, sourceIds: ID[], max = 8): Card[] {
  const cards: Card[] = [];
  const chunks = chunkText(text, 600, 80);
  const keys = extractKeyphrases(text, 6);

  for (const chunk of chunks.slice(0, 3)) {
    if (cards.length >= max) break;
    const sentences = chunk.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);

    // Worked example card
    if (sentences[0]) {
      cards.push(makeProblem(brainId, sourceIds, {
        front: `Worked example:\n${sentences[0]}\n\nWhat is the key step?`,
        back: sentences[1] ?? sentences[0],
        bloom: "understand",
      }));
    }

    // Faded hint problem
    const prompt = sentences.find((s) => /\d|step|algorithm|function|solve/i.test(s)) ?? sentences[0];
    if (prompt && cards.length < max) {
      const hint = keys[0] ? `HINT: Think about ${keys[0]}` : "HINT: Re-read the source";
      cards.push(makeProblem(brainId, sourceIds, {
        front: `Problem: ${prompt.slice(0, 200)}`,
        back: `TEST: typeof solution === "function"\n${hint}`,
        bloom: "apply",
      }));
    }
  }

  if (!cards.length && text.length > 40) {
    cards.push(makeProblem(brainId, sourceIds, {
      front: `Apply what you learned:\n${text.slice(0, 180)}`,
      back: `TEST: typeof solution === "function"\nHINT: Break into steps`,
      bloom: "apply",
    }));
  }

  return cards;
}

function makeProblem(
  brainId: string,
  sourceIds: ID[],
  o: { front: string; back: string; bloom: "understand" | "apply" | "analyze" },
): Card {
  return {
    id: newId("card"),
    brainId,
    kind: "problem",
    bloom: o.bloom,
    front: o.front,
    back: o.back,
    atomIds: [],
    sourceIds,
    conceptIds: [],
    fsrs: newCardState(),
    createdAt: now(),
  };
}

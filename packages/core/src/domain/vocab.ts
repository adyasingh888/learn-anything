/**
 * Language domain — mine vocab candidates from captured text.
 */
import { extractKeyphrases } from "../ingest/index.js";
import type { Card, Source } from "../types.js";
import { newCardState } from "../srs/fsrs.js";
import { newId, now } from "../ids.js";

const STOP = new Set(
  "the a an is are was were be been being have has had do does did will would could should may might must and or but if then than that this these those with from for not".split(
    " ",
  ),
);

export interface VocabItem {
  term: string;
  context: string;
  frequency: number;
}

export function mineVocab(sources: Source[], limit = 24): VocabItem[] {
  const counts = new Map<string, { context: string; n: number }>();

  for (const s of sources) {
    const sentences = s.text.split(/(?<=[.!?])\s+/);
    for (const sent of sentences) {
      if (sent.length < 12 || sent.length > 200) continue;
      const words = sent.match(/\b[\p{L}]{4,}\b/gu) ?? [];
      for (const w of words) {
        const term = w.toLowerCase();
        if (STOP.has(term)) continue;
        const prev = counts.get(term);
        if (prev) prev.n++;
        else counts.set(term, { context: sent.slice(0, 120), n: 1 });
      }
    }
  }

  const phrases = sources.flatMap((s) => extractKeyphrases(s.text, 6));
  for (const ph of phrases) {
    if (ph.split(" ").length > 1) {
      const prev = counts.get(ph.toLowerCase());
      if (prev) prev.n += 2;
      else counts.set(ph.toLowerCase(), { context: ph, n: 2 });
    }
  }

  return [...counts.entries()]
    .map(([term, v]) => ({ term, context: v.context, frequency: v.n }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

export function vocabToCards(brainId: string, items: VocabItem[], sourceIds: string[]): Card[] {
  return items.slice(0, 15).map((v) => ({
    id: newId("card"),
    brainId,
    kind: "cloze" as const,
    bloom: "remember" as const,
    front: v.context.replace(new RegExp(`\\b${escape(v.term)}\\b`, "i"), "**[…]**"),
    back: v.term,
    atomIds: [],
    sourceIds,
    conceptIds: [],
    fsrs: newCardState(),
    createdAt: now(),
  }));
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

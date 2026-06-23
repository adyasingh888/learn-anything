/**
 * Exam blueprint + mock exam builder.
 */
import type { Card, Objective } from "../types.js";

export interface ExamBlueprint {
  total: number;
  byKind: Record<string, number>;
  byBloom: Record<string, number>;
  objectiveTags: string[];
}

export function buildExamBlueprint(cards: Card[], objectives: Objective[]): ExamBlueprint {
  const pool = cards.filter((c) => !c.suspended && ["qa", "cloze", "free-recall", "problem"].includes(c.kind));
  const byKind: Record<string, number> = {};
  const byBloom: Record<string, number> = {};
  for (const c of pool) {
    byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
    byBloom[c.bloom] = (byBloom[c.bloom] ?? 0) + 1;
  }
  return {
    total: pool.length,
    byKind,
    byBloom,
    objectiveTags: objectives.map((o) => o.title),
  };
}

export interface MockExamOptions {
  count?: number;
  timedSecPerQ?: number;
  weightWeak?: boolean;
  weakCardIds?: string[];
}

export function buildMockExam(pool: Card[], opts: MockExamOptions = {}): Card[] {
  const count = Math.min(opts.count ?? 10, pool.length);
  let candidates = pool.filter((c) => ["qa", "cloze", "free-recall", "problem"].includes(c.kind));

  if (opts.weakCardIds?.length) {
    const weak = new Set(opts.weakCardIds);
    const weakCards = candidates.filter((c) => weak.has(c.id));
    const rest = candidates.filter((c) => !weak.has(c.id));
    candidates = [...weakCards, ...rest];
  }

  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

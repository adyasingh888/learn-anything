/**
 * Session builder + personalization. Turns a pile of cards into an ordered
 * study queue using the mode's scheduler config: due-first, optionally
 * interleaved across concepts (desirable difficulty), with new-card throttling.
 */
import { isDue, retrievability } from "../srs/fsrs.js";
import type { Activity, Card, MasteryState, Objective } from "../types.js";
import type { LearningMode } from "../modes/types.js";

export interface SessionOptions {
  mode: LearningMode;
  /** Max cards in this session. */
  limit?: number;
  /** Cap on brand-new cards to avoid overload. */
  newLimit?: number;
  at?: number;
}

export function buildSession(cards: Card[], opts: SessionOptions): Card[] {
  const at = opts.at ?? Date.now();
  const limit = opts.limit ?? 20;
  const newLimit = opts.newLimit ?? 8;

  const active = cards.filter((c) => !c.suspended);
  const due = active.filter((c) => c.fsrs.reps > 0 && isDue(c.fsrs, at));
  const fresh = active.filter((c) => c.fsrs.reps === 0).slice(0, newLimit);

  // Most-overdue (lowest retrievability) first within reviews.
  due.sort((a, b) => retrievability(a.fsrs, at) - retrievability(b.fsrs, at));

  let queue = [...due, ...fresh].slice(0, limit);
  if (opts.mode.scheduler.interleave) queue = interleaveByConcept(queue);
  return queue;
}

/** Spread cards so consecutive ones rarely share a concept (interleaving). */
function interleaveByConcept(cards: Card[]): Card[] {
  const buckets = new Map<string, Card[]>();
  for (const c of cards) {
    const key = c.conceptIds[0] ?? c.id;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  const lists = [...buckets.values()];
  const out: Card[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const list of lists) {
      const next = list.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

/** How many cards are due right now (for dashboards / badges). */
export function dueCount(cards: Card[], at = Date.now()): number {
  return cards.filter((c) => !c.suspended && c.fsrs.reps > 0 && isDue(c.fsrs, at)).length;
}

/**
 * Update an objective's mastery estimate from a graded activity. Uses a simple
 * exponential update toward the observed score, with light forgetting applied
 * by the caller over time. Mastery learning gates advancement at >= 0.8.
 */
export function updateMastery(
  prev: MasteryState | undefined,
  activity: Activity,
  alpha = 0.4,
): MasteryState {
  const score = activity.score ?? 0;
  const base = prev?.mastery ?? 0;
  return {
    objectiveId: activity.objectiveId!,
    brainId: activity.brainId,
    mastery: clamp01(base + alpha * (score - base)),
    lastUpdated: activity.at,
  };
}

export const MASTERY_THRESHOLD = 0.8;

export function isMastered(state: MasteryState | undefined): boolean {
  return (state?.mastery ?? 0) >= MASTERY_THRESHOLD;
}

/** Next objective whose prerequisites are all mastered (curriculum gating). */
export function nextObjective(
  objectives: Objective[],
  mastery: Map<string, MasteryState>,
): Objective | undefined {
  return objectives.find((o) => {
    if (isMastered(mastery.get(o.id))) return false;
    return o.prerequisiteIds.every((p) => isMastered(mastery.get(p)));
  });
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

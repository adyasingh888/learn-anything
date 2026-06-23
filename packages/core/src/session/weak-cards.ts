/**
 * Weakness-targeted review from mock-exam and low-grade review activities.
 */
import type { Activity, Card, ID } from "../types.js";
import type { LearningMode } from "../modes/types.js";
import { buildSession, type SessionOptions } from "./index.js";

export function getWeakCardIds(activities: Activity[], brainId: ID): ID[] {
  const ids = new Set<ID>();
  for (const a of activities) {
    if (a.brainId !== brainId) continue;
    if (a.kind === "mock-exam" && a.payload?.wrongCardIds) {
      for (const id of a.payload.wrongCardIds as string[]) ids.add(id);
    }
    if (a.kind === "review" && a.cardId && (a.score ?? 1) < 0.5) {
      ids.add(a.cardId);
    }
  }
  return [...ids];
}

/** Session prioritizing weak cards, then falling back to normal FSRS queue. */
export function buildWeaknessSession(
  cards: Card[],
  activities: Activity[],
  brainId: ID,
  opts: SessionOptions,
): Card[] {
  const weakIds = new Set(getWeakCardIds(activities, brainId));
  const weak = cards.filter((c) => weakIds.has(c.id) && !c.suspended);
  const rest = buildSession(
    cards.filter((c) => !weakIds.has(c.id)),
    { ...opts, limit: Math.max(0, (opts.limit ?? 20) - weak.length) },
  );
  return [...weak, ...rest].slice(0, opts.limit ?? 20);
}

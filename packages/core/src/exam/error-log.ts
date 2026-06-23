/**
 * Exam error log from mock-exam activities.
 */
import type { Activity, Card } from "../types.js";

export interface ErrorLogEntry {
  cardId: string;
  front: string;
  back: string;
  count: number;
  lastAt: number;
}

export function getErrorLog(activities: Activity[], cards: Card[], brainId: string): ErrorLogEntry[] {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const errors = new Map<string, { count: number; lastAt: number }>();

  for (const a of activities) {
    if (a.brainId !== brainId || a.kind !== "mock-exam") continue;
    const wrongIds = (a.payload?.wrongCardIds as string[]) ?? [];
    for (const id of wrongIds) {
      const prev = errors.get(id);
      errors.set(id, { count: (prev?.count ?? 0) + 1, lastAt: Math.max(prev?.lastAt ?? 0, a.at) });
    }
  }

  return [...errors.entries()]
    .map(([cardId, meta]) => {
      const card = cardMap.get(cardId);
      return {
        cardId,
        front: card?.front ?? cardId,
        back: card?.back ?? "",
        count: meta.count,
        lastAt: meta.lastAt,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getWeakCardIdsFromLog(log: ErrorLogEntry[]): string[] {
  return log.map((e) => e.cardId);
}

/**
 * Review reminder scheduling.
 */
import { dueCount } from "../session/index.js";
import type { Brain, Card } from "../types.js";

export interface ReminderPrefs {
  enabled: boolean;
  hourLocal: number;
  minDue: number;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  enabled: false,
  hourLocal: 9,
  minDue: 1,
};

export function computeDueSummary(brains: Brain[], cards: Card[]): { totalDue: number; byBrain: { brainId: string; name: string; due: number }[] } {
  const byBrain = brains
    .map((b) => ({
      brainId: b.id,
      name: b.name,
      due: dueCount(cards.filter((c) => c.brainId === b.id)),
    }))
    .filter((x) => x.due > 0);

  return { totalDue: byBrain.reduce((s, x) => s + x.due, 0), byBrain };
}

export function shouldNotifyNow(prefs: ReminderPrefs, totalDue: number, now = new Date()): boolean {
  if (!prefs.enabled || totalDue < prefs.minDue) return false;
  return now.getHours() === prefs.hourLocal;
}

export function msUntilNextReminder(prefs: ReminderPrefs, now = new Date()): number {
  const next = new Date(now);
  next.setHours(prefs.hourLocal, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

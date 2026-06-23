/**
 * Success metrics computation from activities + cards.
 */
import { isMastered } from "./index.js";
import type { Activity, Card, MasteryState } from "../types.js";
import type { Metric } from "../modes/types.js";

export function computeSuccessMetrics(
  metrics: Metric[],
  activities: Activity[],
  cards: Card[],
  mastery: MasteryState[],
): Partial<Record<Metric, number>> {
  const out: Partial<Record<Metric, number>> = {};

  for (const m of metrics) {
    switch (m) {
      case "retention": {
        const reviewed = cards.filter((c) => c.fsrs.reps > 0);
        const stable = reviewed.filter((c) => c.fsrs.lapses === 0 && c.fsrs.reps >= 2);
        out.retention = reviewed.length ? stable.length / reviewed.length : 0;
        break;
      }
      case "mastery": {
        out.mastery = mastery.length
          ? mastery.reduce((s, x) => s + x.mastery, 0) / mastery.length
          : 0;
        break;
      }
      case "accuracy": {
        const scored = activities.filter((a) => a.score != null);
        out.accuracy = scored.length
          ? scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length
          : 0;
        break;
      }
      case "fluency": {
        const speak = activities.filter((a) => a.kind === "speak" || a.kind === "listen");
        out.fluency = speak.length
          ? speak.reduce((s, a) => s + (a.score ?? 0.5), 0) / speak.length
          : 0;
        break;
      }
      case "coverage": {
        const sourcesTouched = new Set(activities.flatMap((a) => (a.payload?.sourceIds as string[]) ?? []));
        out.coverage = Math.min(1, sourcesTouched.size / 10);
        break;
      }
      case "streak": {
        out.streak = computeStreakDays(activities);
        break;
      }
      case "practice-minutes": {
        const sec = activities.reduce((s, a) => s + (a.durationSec ?? 0), 0);
        out["practice-minutes"] = sec / 60;
        break;
      }
      case "words-known": {
        const vocabActs = activities.filter((a) => a.payload?.vocabCards);
        out["words-known"] = vocabActs.reduce((s, a) => s + Number(a.payload?.vocabCards ?? 0), 0);
        break;
      }
      default:
        break;
    }
  }

  return out;
}

function computeStreakDays(activities: Activity[]): number {
  if (!activities.length) return 0;
  const days = new Set(activities.map((a) => new Date(a.at).toDateString()));
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function masteredCount(mastery: MasteryState[]): number {
  return mastery.filter((m) => isMastered(m)).length;
}

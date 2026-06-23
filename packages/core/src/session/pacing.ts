/**
 * Deadline-aware pacing from objectives + mastery.
 */
import { MASTERY_THRESHOLD, isMastered } from "./index.js";
import type { MasteryState, Objective } from "../types.js";

export interface PacingInfo {
  daysLeft: number | null;
  weeksLeft: number | null;
  objectivesTotal: number;
  objectivesMastered: number;
  objectivesRemaining: number;
  suggestedPerWeek: number | null;
  onTrack: boolean;
  message: string;
}

export function computePacing(
  deadline: string | undefined,
  objectives: Objective[],
  mastery: MasteryState[],
): PacingInfo {
  const masteryMap = new Map(mastery.map((m) => [m.objectiveId, m]));
  const total = objectives.length;
  const mastered = objectives.filter((o) => isMastered(masteryMap.get(o.id))).length;
  const remaining = total - mastered;

  let daysLeft: number | null = null;
  let weeksLeft: number | null = null;
  if (deadline) {
    const end = new Date(deadline).getTime();
    daysLeft = Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
    weeksLeft = daysLeft > 0 ? Math.ceil(daysLeft / 7) : 0;
  }

  const suggestedPerWeek =
    weeksLeft && weeksLeft > 0 && remaining > 0 ? Math.ceil(remaining / weeksLeft) : null;

  let onTrack = true;
  let message = "Set a target date in Settings for pacing guidance.";
  if (deadline && daysLeft !== null) {
    if (remaining === 0) {
      message = "All objectives mastered — you're on track.";
      onTrack = true;
    } else if (daysLeft === 0) {
      message = `Deadline is today — ${remaining} objective${remaining === 1 ? "" : "s"} left.`;
      onTrack = false;
    } else if (suggestedPerWeek !== null) {
      const needed = remaining / Math.max(weeksLeft!, 1);
      onTrack = needed <= suggestedPerWeek + 0.5;
      message = onTrack
        ? `~${suggestedPerWeek}/week to hit ${MASTERY_THRESHOLD * 100}% on all objectives.`
        : `Behind pace — aim for ${Math.ceil(needed)} objectives/week (${daysLeft} days left).`;
    }
  } else if (remaining > 0) {
    message = `${remaining} of ${total} objectives not yet at ${MASTERY_THRESHOLD * 100}% mastery.`;
  }

  return {
    daysLeft,
    weeksLeft,
    objectivesTotal: total,
    objectivesMastered: mastered,
    objectivesRemaining: remaining,
    suggestedPerWeek,
    onTrack,
    message,
  };
}

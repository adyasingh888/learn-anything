/**
 * Mode engine — executes loop stages, activities, and metrics from declarative configs.
 */
import type { Activity, Card, MasteryState, Objective } from "../types.js";
import type { ActivityType, LearningMode, LoopStage, Metric } from "./types.js";
import { runStageGenerators, filterCardsForMode, type GeneratorContext } from "./generators.js";
import { runFeedback, type FeedbackInput } from "./feedback.js";
import { buildSession, nextObjective } from "../session/index.js";
import { gateSessionCards } from "../session/curriculum.js";
import { computeSuccessMetrics } from "../session/metrics.js";
import { createScheduler } from "../srs/fsrs.js";

export function runLoopStage(
  mode: LearningMode,
  stage: LoopStage,
  ctx: GeneratorContext,
) {
  return runStageGenerators(mode, stage, ctx);
}

export function buildModeSession(
  cards: Card[],
  mode: LearningMode,
  objectives: Objective[],
  mastery: MasteryState[],
  opts?: { limit?: number },
): Card[] {
  const gated = gateSessionCards(cards, objectives, mastery);
  return buildSession(gated, { mode, limit: opts?.limit ?? 20 });
}

export function modeScheduler(mode: LearningMode, targetRetentionOverride?: number) {
  return createScheduler({
    targetRetention: targetRetentionOverride ?? mode.scheduler.targetRetention,
  });
}

export function activityAllowed(mode: LearningMode, activity: ActivityType): boolean {
  return mode.practice.includes(activity) || mode.produce.includes(activity);
}

export function primaryFeedback(mode: LearningMode) {
  return mode.feedback[0] ?? "self-rating";
}

export function gradeActivity(
  mode: LearningMode,
  input: Omit<FeedbackInput, "provider"> & { provider?: FeedbackInput["provider"] },
): ReturnType<typeof runFeedback> {
  const provider = input.provider ?? primaryFeedback(mode);
  return runFeedback({ ...input, provider });
}

export function computeModeMetrics(
  mode: LearningMode,
  activities: Activity[],
  cards: Card[],
  mastery: MasteryState[],
): Partial<Record<Metric, number>> {
  return computeSuccessMetrics(mode.successMetrics, activities, cards, mastery);
}

export function currentObjectiveId(objectives: Objective[], mastery: MasteryState[]): string | undefined {
  const map = new Map(mastery.map((m) => [m.objectiveId, m]));
  return nextObjective(objectives, map)?.id;
}

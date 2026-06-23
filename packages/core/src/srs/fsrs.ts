/**
 * Spaced-repetition scheduler — the universal "memory" substrate shared by
 * every learning mode. Wraps the open-source FSRS algorithm (DSR memory model)
 * so the rest of the app speaks our plain `FsrsState`, not library types.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
} from "ts-fsrs";
import type { FsrsState } from "../types.js";

/** Learner rating after seeing the answer. */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

const GRADE_TO_RATING: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export interface SchedulerOptions {
  /** Desired retention (0..1). Higher = more frequent reviews. Default 0.9. */
  targetRetention?: number;
  /** Whether to allow "fuzz" so reviews don't all pile on the same day. */
  enableFuzz?: boolean;
}

export function createScheduler(opts: SchedulerOptions = {}): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: opts.targetRetention ?? 0.9,
      enable_fuzz: opts.enableFuzz ?? true,
    }),
  );
}

/** A fresh, never-reviewed memory state (epoch-ms `due`). */
export function newCardState(): FsrsState {
  return toState(createEmptyCard(new Date()));
}

/** Apply one review, returning the next memory state. */
export function review(
  scheduler: FSRS,
  state: FsrsState,
  grade: ReviewGrade,
  reviewedAt: Date = new Date(),
): FsrsState {
  const card = fromState(state);
  const result = scheduler.next(card, reviewedAt, GRADE_TO_RATING[grade]);
  return toState(result.card);
}

/**
 * Preview the next interval (in days) for each possible grade — used to show
 * "Again / Hard / Good / Easy" buttons with their resulting spacing.
 */
export function previewIntervals(
  scheduler: FSRS,
  state: FsrsState,
  at: Date = new Date(),
): Record<ReviewGrade, number> {
  const card = fromState(state);
  const record = scheduler.repeat(card, at);
  const days = (g: Grade) =>
    Math.max(0, Math.round((record[g].card.due.getTime() - at.getTime()) / 86_400_000));
  return {
    again: days(Rating.Again),
    hard: days(Rating.Hard),
    good: days(Rating.Good),
    easy: days(Rating.Easy),
  };
}

/** Cards whose `due` is at or before `at`. */
export function isDue(state: FsrsState, at: number = Date.now()): boolean {
  return state.due <= at;
}

/** Estimated probability of recall right now (retrievability), 0..1. */
export function retrievability(state: FsrsState, at: number = Date.now()): number {
  if (state.reps === 0 || state.stability <= 0) return 0;
  const elapsedDays = Math.max(0, (at - (state.lastReview ?? state.due)) / 86_400_000);
  // FSRS forgetting curve with factor for 90% retention at t = stability.
  const decay = -0.5;
  const factor = 0.9 ** (1 / decay) - 1;
  return (1 + (factor * elapsedDays) / state.stability) ** decay;
}

function fromState(s: FsrsState): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  } as FsrsCard;
}

function toState(c: FsrsCard): FsrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as FsrsState["state"],
    lastReview: c.last_review ? new Date(c.last_review).getTime() : undefined,
  };
}

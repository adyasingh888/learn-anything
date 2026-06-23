/**
 * The Learning-Modes framework (plan section 2.4).
 *
 * A mode is DATA, not a fork of the app. Shipping a new domain = authoring a
 * `LearningMode` config + any new activity/feedback plugins. Every mode
 * implements the same universal loop (Capture → Distill → Understand →
 * Practice → Produce → Reflect → Resurface); modes differ in HOW each stage is
 * realized.
 */
import type { BloomLevel, CardKind, DomainType } from "../types.js";

export type LoopStage =
  | "capture"
  | "distill"
  | "understand"
  | "practice"
  | "produce"
  | "reflect"
  | "resurface";

/** A content generator the mode uses at a given loop stage. */
export type GeneratorRef =
  | "summarize"
  | "atomize"
  | "explain"
  | "concept-map"
  | "socratic"
  | "dialogue"
  | "graded-reader"
  | "problem-set"
  | "mnemonic"
  | "lit-synthesis"
  | "critique"
  | "curriculum";

/** A practice/production activity the learner actually does. */
export type ActivityType =
  | "flashcard"
  | "cloze"
  | "free-recall"
  | "teach-back"
  | "problem"
  | "code"
  | "speak"
  | "listen"
  | "shadow"
  | "write"
  | "record"
  | "mock-exam"
  | "concept-map"
  | "critique";

export type FeedbackProvider =
  | "self-rating"
  | "text-grade"
  | "rubric"
  | "audio-analysis" // pitch / tempo / timing
  | "pronunciation"
  | "code-tests"
  | "answer-key";

export type Metric =
  | "retention"
  | "mastery"
  | "accuracy"
  | "fluency"
  | "coverage"
  | "streak"
  | "practice-minutes"
  | "words-known";

export interface SchedulerConfig {
  algorithm: "fsrs6";
  /** Desired retention 0..1. */
  targetRetention: number;
  interleave: boolean;
}

export interface LearningMode {
  id: string;
  name: string;
  tagline: string;
  domainTypes: DomainType[];
  /** Which generators run at each loop stage. */
  loopStages: Partial<Record<LoopStage, GeneratorRef[]>>;
  practice: ActivityType[];
  produce: ActivityType[];
  scheduler: SchedulerConfig;
  inputModalities: ("text" | "audio" | "image" | "video")[];
  feedback: FeedbackProvider[];
  successMetrics: Metric[];
  /** Card kinds this mode prefers to generate. */
  preferredCardKinds: CardKind[];
  /** Target Bloom distribution for generated content. */
  bloomTargets: BloomLevel[];
  /** Quality threshold (0..1); content below this is held back. */
  qualityThreshold: number;
}

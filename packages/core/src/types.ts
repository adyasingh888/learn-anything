/**
 * Core domain model for Learn Anything.
 *
 * Everything is centered on a `Brain`: a topic workspace whose `domainType`
 * selects a `LearningMode` (see ./modes). The same substrate (sources, atoms,
 * a knowledge graph, SRS cards, sessions) is reused across every mode.
 */

export type ID = string;

export type DomainType =
  | "general" // capture / digest (the default second-brain behaviour)
  | "language"
  | "concept" // academic conceptual knowledge
  | "procedural" // math / programming / engineering practice
  | "research" // dissertation, literature review
  | "performance" // instrument, voice, sport, public speaking
  | "creative" // writing, drawing, design, composition
  | "memory" // anatomy, law, vocab, raw facts
  | "exam" // certification / standardized test prep
  | "project"; // cooking, photography, professional how-to

/** Privacy posture controls where data and AI processing may travel. */
export interface PrivacyPolicy {
  /** "device" = nothing leaves the device; "cloud" = scoped, zero-retention cloud AI allowed. */
  aiProcessing: "device" | "cloud";
  /** Whether captured raw content may be sent to a cloud LLM (with consent) for generation. */
  allowCloudGeneration: boolean;
}

export const DEFAULT_PRIVACY_POLICY: PrivacyPolicy = {
  aiProcessing: "cloud",
  allowCloudGeneration: true,
};

export interface Brain {
  id: ID;
  name: string;
  domainType: DomainType;
  /** Optional override of the default mode for the domain type. */
  modeId?: string;
  /** Free-text learner goal, e.g. "Hold a 10-minute conversation in Spanish". */
  goal?: string;
  /** ISO date string; drives curriculum pacing. */
  deadline?: string;
  privacy: PrivacyPolicy;
  /** Per-brain mode configuration overrides (target retention, etc.). */
  settings?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type SourceKind = "link" | "file" | "note" | "audio" | "image";

export interface Source {
  id: ID;
  brainId: ID;
  kind: SourceKind;
  title: string;
  /** Original URL for links, or filename for files. */
  url?: string;
  /** Extracted/cleaned plain text (article body, transcript, OCR, note body). */
  text: string;
  /** Free-form metadata (author, siteName, durationSec, mimeType, ...). */
  meta: Record<string, unknown>;
  /** Provenance for every generated artifact that uses this source. */
  capturedAt: number;
  /** Pipeline status. */
  status: "captured" | "extracting" | "ready" | "error";
}

/**
 * An Atom is the Zettelkasten unit: one idea, restated in your own words,
 * linked to its source(s). Atoms are what the graph connects and what most
 * SRS cards are derived from.
 */
export interface Atom {
  id: ID;
  brainId: ID;
  title: string;
  body: string;
  sourceIds: ID[];
  /** Embedding vector (computed on-device); optional until indexed. */
  embedding?: number[];
  conceptIds: ID[];
  createdAt: number;
  updatedAt: number;
}

/** A node in the per-brain knowledge graph. */
export interface Concept {
  id: ID;
  brainId: ID;
  label: string;
  aliases: string[];
  embedding?: number[];
}

export type EdgeRelation =
  | "related"
  | "prerequisite"
  | "example-of"
  | "contradicts"
  | "supports"
  | "part-of"
  | "defines";

/** A typed, directed connection in the knowledge graph. */
export interface Edge {
  id: ID;
  brainId: ID;
  from: ID; // conceptId or atomId
  to: ID;
  relation: EdgeRelation;
  /** 0..1 confidence; auto-links start low, user-confirmed links are 1. */
  weight: number;
}

/** Bloom's revised taxonomy — used to calibrate question depth & quality. */
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export type CardKind =
  | "qa" // question / answer
  | "cloze" // fill in the blank
  | "free-recall" // explain X from memory
  | "teach-back" // Feynman: explain to a novice
  | "problem" // procedural problem with steps
  | "speak" // produce spoken language
  | "listen" // comprehension of audio
  | "produce"; // open production (essay, performance brief)

/** FSRS-6 memory state persisted per card. */
export interface FsrsState {
  due: number; // epoch ms
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3; // New | Learning | Review | Relearning
  lastReview?: number;
}

export interface Card {
  id: ID;
  brainId: ID;
  kind: CardKind;
  bloom: BloomLevel;
  front: string;
  back: string;
  /** What this card is derived from (atoms / sources) — for provenance. */
  atomIds: ID[];
  sourceIds: ID[];
  conceptIds: ID[];
  fsrs: FsrsState;
  /** 1 (again) .. 4 (easy); last grade for analytics. */
  suspended?: boolean;
  createdAt: number;
}

/** A logged learning event — the raw signal that drives personalization. */
export interface Activity {
  id: ID;
  brainId: ID;
  kind: string; // "review" | "tutor" | "practice" | "recording" | "mock-exam" ...
  cardId?: ID;
  objectiveId?: ID;
  /** 0..1 normalized outcome (accuracy / score / self-rating). */
  score?: number;
  durationSec?: number;
  payload?: Record<string, unknown>;
  at: number;
}

/** A learning objective for mastery learning + curriculum sequencing. */
export interface Objective {
  id: ID;
  brainId: ID;
  title: string;
  description?: string;
  bloomTarget: BloomLevel;
  prerequisiteIds: ID[];
}

export interface MasteryState {
  objectiveId: ID;
  brainId: ID;
  /** 0..1 estimated mastery (decays over time, rises with successful recall). */
  mastery: number;
  lastUpdated: number;
}

/** An ordered curriculum for course-style brains. */
export interface Path {
  id: ID;
  brainId: ID;
  title: string;
  objectiveIds: ID[];
}

export type ArtifactKind =
  | "summary"
  | "explainer"
  | "lesson"
  | "quiz"
  | "concept-map"
  | "dialogue"
  | "critique"
  | "outline";

/** A unit of generated content with its quality metadata and provenance. */
export interface Artifact {
  id: ID;
  brainId: ID;
  kind: ArtifactKind;
  title: string;
  body: string;
  citations: Citation[];
  quality: QualityReport;
  createdAt: number;
}

export interface Citation {
  sourceId?: ID;
  atomId?: ID;
  quote?: string;
}

/** Output of the content quality rubric / verification pass. */
export interface QualityReport {
  grounded: boolean; // every claim cites provenance
  verified: boolean; // passed the checker pass
  bloomCoverage: BloomLevel[];
  flags: string[]; // unsupported claims, hallucination risks, etc.
  /** 0..1 overall score. Content below the brain's threshold is held back. */
  score: number;
}

export interface MediaAsset {
  id: ID;
  brainId: ID;
  kind: "audio" | "image" | "video";
  /** Local object URL or encrypted blob ref. */
  ref: string;
  durationSec?: number;
  analysis?: Record<string, unknown>; // pitch/tempo/pronunciation results
  createdAt: number;
}

/**
 * The mode registry — one config per row of the taxonomy in plan section 2.3.
 * These are intentionally declarative so new domains are cheap to add.
 */
import type { DomainType } from "../types.js";
import type { LearningMode } from "./types.js";

const fsrs = (targetRetention: number, interleave = true) =>
  ({ algorithm: "fsrs6", targetRetention, interleave }) as const;

export const MODES: Record<string, LearningMode> = {
  "capture-digest": {
    id: "capture-digest",
    name: "Capture & Digest",
    tagline: "I saw something interesting — keep it, connect it, resurface it.",
    domainTypes: ["general"],
    loopStages: {
      distill: ["summarize", "atomize"],
      understand: ["explain", "concept-map"],
      resurface: [],
    },
    practice: ["flashcard", "free-recall"],
    produce: ["teach-back"],
    scheduler: fsrs(0.85),
    inputModalities: ["text", "image"],
    feedback: ["self-rating", "text-grade"],
    successMetrics: ["retention", "coverage", "streak"],
    preferredCardKinds: ["qa", "cloze", "free-recall"],
    bloomTargets: ["remember", "understand", "analyze"],
    qualityThreshold: 0.5,
  },

  "language-immersion": {
    id: "language-immersion",
    name: "Language Immersion",
    tagline: "Comprehensible input + spaced vocab + real conversation.",
    domainTypes: ["language"],
    loopStages: {
      distill: ["atomize"],
      understand: ["graded-reader", "explain"],
      produce: ["dialogue"],
    },
    practice: ["flashcard", "cloze", "listen", "shadow", "speak"],
    produce: ["speak", "write"],
    scheduler: fsrs(0.9),
    inputModalities: ["text", "audio"],
    feedback: ["self-rating", "pronunciation", "audio-analysis", "text-grade"],
    successMetrics: ["words-known", "retention", "fluency", "practice-minutes"],
    preferredCardKinds: ["cloze", "qa", "speak", "listen"],
    bloomTargets: ["remember", "understand", "apply"],
    qualityThreshold: 0.55,
  },

  "concept-mastery": {
    id: "concept-mastery",
    name: "Concept Mastery",
    tagline: "Understand the why, map the connections, recall on demand.",
    domainTypes: ["concept"],
    loopStages: {
      distill: ["summarize", "atomize"],
      understand: ["explain", "concept-map", "socratic"],
    },
    practice: ["flashcard", "free-recall", "concept-map", "teach-back"],
    produce: ["teach-back", "write"],
    scheduler: fsrs(0.9),
    inputModalities: ["text", "image"],
    feedback: ["self-rating", "text-grade", "rubric"],
    successMetrics: ["mastery", "retention", "coverage"],
    preferredCardKinds: ["qa", "free-recall", "teach-back"],
    bloomTargets: ["understand", "analyze", "evaluate"],
    qualityThreshold: 0.6,
  },

  "practice-drill": {
    id: "practice-drill",
    name: "Practice & Drill",
    tagline: "Worked examples, then faded practice with instant feedback.",
    domainTypes: ["procedural"],
    loopStages: {
      understand: ["explain", "problem-set"],
      practice: ["problem-set"],
    },
    practice: ["problem", "code", "flashcard"],
    produce: ["code", "problem"],
    scheduler: fsrs(0.88),
    inputModalities: ["text"],
    feedback: ["answer-key", "code-tests", "text-grade"],
    successMetrics: ["accuracy", "mastery", "practice-minutes"],
    preferredCardKinds: ["problem", "qa"],
    bloomTargets: ["apply", "analyze", "create"],
    qualityThreshold: 0.6,
  },

  "research-scholar": {
    id: "research-scholar",
    name: "Research & Scholar",
    tagline: "Map the literature, challenge claims, find the gaps, write.",
    domainTypes: ["research"],
    loopStages: {
      distill: ["summarize", "atomize", "lit-synthesis"],
      understand: ["concept-map", "socratic"],
      produce: ["lit-synthesis", "critique"],
    },
    practice: ["free-recall", "concept-map", "critique"],
    produce: ["write", "critique"],
    scheduler: fsrs(0.85, true),
    inputModalities: ["text", "image"],
    feedback: ["rubric", "text-grade"],
    successMetrics: ["coverage", "mastery"],
    preferredCardKinds: ["free-recall", "qa"],
    bloomTargets: ["analyze", "evaluate", "create"],
    qualityThreshold: 0.65,
  },

  "practice-studio": {
    id: "practice-studio",
    name: "Practice Studio",
    tagline: "Deliberate practice: chunk it, slow it down, record, review.",
    domainTypes: ["performance"],
    loopStages: {
      understand: ["explain"],
      practice: [],
      reflect: ["critique"],
    },
    practice: ["record", "shadow"],
    produce: ["record"],
    scheduler: fsrs(0.8, true),
    inputModalities: ["audio", "video", "text"],
    feedback: ["audio-analysis", "self-rating", "rubric"],
    successMetrics: ["practice-minutes", "accuracy", "streak"],
    preferredCardKinds: ["produce"],
    bloomTargets: ["apply", "create"],
    qualityThreshold: 0.5,
  },

  "studio-critique": {
    id: "studio-critique",
    name: "Studio & Critique",
    tagline: "Study exemplars, imitate, create, get structured critique.",
    domainTypes: ["creative"],
    loopStages: {
      understand: ["explain"],
      produce: ["critique"],
    },
    practice: ["write", "record"],
    produce: ["write", "record"],
    scheduler: fsrs(0.8),
    inputModalities: ["text", "image", "audio"],
    feedback: ["rubric", "text-grade"],
    successMetrics: ["practice-minutes", "streak"],
    preferredCardKinds: ["produce"],
    bloomTargets: ["create", "evaluate"],
    qualityThreshold: 0.5,
  },

  memory: {
    id: "memory",
    name: "Memory",
    tagline: "High-volume facts, mnemonics, and a memory palace.",
    domainTypes: ["memory"],
    loopStages: {
      distill: ["atomize"],
      understand: ["mnemonic"],
    },
    practice: ["cloze", "flashcard", "free-recall"],
    produce: ["free-recall"],
    scheduler: fsrs(0.92),
    inputModalities: ["text", "image"],
    feedback: ["self-rating", "answer-key"],
    successMetrics: ["retention", "words-known", "streak"],
    preferredCardKinds: ["cloze", "qa"],
    bloomTargets: ["remember", "understand"],
    qualityThreshold: 0.5,
  },

  "exam-prep": {
    id: "exam-prep",
    name: "Exam Prep",
    tagline: "Mastery learning, mock tests, error log, weakness targeting.",
    domainTypes: ["exam"],
    loopStages: {
      understand: ["explain", "problem-set"],
      practice: ["problem-set"],
      reflect: [],
    },
    practice: ["mock-exam", "problem", "flashcard"],
    produce: ["problem"],
    scheduler: fsrs(0.9),
    inputModalities: ["text", "image"],
    feedback: ["answer-key", "rubric", "text-grade"],
    successMetrics: ["accuracy", "mastery", "coverage"],
    preferredCardKinds: ["qa", "problem", "cloze"],
    bloomTargets: ["understand", "apply", "analyze"],
    qualityThreshold: 0.6,
  },

  "project-apprenticeship": {
    id: "project-apprenticeship",
    name: "Project & Apprenticeship",
    tagline: "Learn by doing — just-in-time lessons toward a real deliverable.",
    domainTypes: ["project"],
    loopStages: {
      understand: ["explain", "curriculum"],
      produce: ["critique"],
    },
    practice: ["problem", "write", "record"],
    produce: ["write", "record", "problem"],
    scheduler: fsrs(0.82),
    inputModalities: ["text", "image", "audio", "video"],
    feedback: ["rubric", "text-grade", "self-rating"],
    successMetrics: ["practice-minutes", "mastery", "streak"],
    preferredCardKinds: ["qa", "problem", "produce"],
    bloomTargets: ["apply", "create", "evaluate"],
    qualityThreshold: 0.55,
  },
};

/** Default mode per domain type. */
const DOMAIN_DEFAULT: Record<DomainType, string> = {
  general: "capture-digest",
  language: "language-immersion",
  concept: "concept-mastery",
  procedural: "practice-drill",
  research: "research-scholar",
  performance: "practice-studio",
  creative: "studio-critique",
  memory: "memory",
  exam: "exam-prep",
  project: "project-apprenticeship",
};

export function defaultModeId(domain: DomainType): string {
  return DOMAIN_DEFAULT[domain];
}

export function getMode(modeId: string | undefined, domain: DomainType): LearningMode {
  return MODES[modeId ?? ""] ?? MODES[defaultModeId(domain)];
}

export function allModes(): LearningMode[] {
  return Object.values(MODES);
}

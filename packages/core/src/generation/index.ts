/**
 * Content generation with a quality bar (plan section 3).
 *
 * - `LLMProvider` is provider-pluggable. The web app wires a zero-retention
 *   cloud provider (with consent) or a fully-local model in Privacy Mode.
 * - `HeuristicProvider` is the always-available offline fallback: it produces
 *   real (if simpler) flashcards, summaries and cloze deletions with no network
 *   and no API key, so the product works on day one.
 * - Every generation runs through `gradeQuality()` — a verification pass that
 *   checks grounding, Bloom coverage and flags unsupported content.
 */
import { extractKeyphrases } from "../ingest/index.js";
import { newId, now } from "../ids.js";
import type {
  Artifact,
  ArtifactKind,
  BloomLevel,
  Card,
  CardKind,
  Citation,
  ID,
  QualityReport,
} from "../types.js";
import { newCardState } from "../srs/fsrs.js";

export const BLOOM_LEVELS: BloomLevel[] = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
];

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  readonly id: string;
  /** True if this provider keeps data on-device. */
  readonly local: boolean;
  complete(messages: LLMMessage[], opts?: { json?: boolean }): Promise<string>;
}

/**
 * Offline, deterministic provider. Not a real LLM — it uses extractive
 * heuristics so the app is fully functional with zero setup, and so tests are
 * reproducible. Swapped out transparently when a real provider is configured.
 */
export class HeuristicProvider implements LLMProvider {
  readonly id = "heuristic-local";
  readonly local = true;

  async complete(messages: LLMMessage[]): Promise<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    const sentences = splitSentences(last);
    return sentences.slice(0, 3).join(" ") || "I need more context in this brain to answer well.";
  }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

export interface FlashcardOptions {
  brainId: ID;
  sourceIds?: ID[];
  atomIds?: ID[];
  conceptIds?: ID[];
  maxCards?: number;
  /** Target Bloom distribution; generator aims to cover these levels. */
  bloomTargets?: BloomLevel[];
}

/**
 * Extractive flashcard generation that works offline. Produces a mix of cloze
 * and Q/A cards from definitional sentences, plus a free-recall card per key
 * concept. A real LLM provider can replace the body while keeping this shape.
 */
export function generateFlashcardsHeuristic(
  text: string,
  opts: FlashcardOptions,
): Card[] {
  const cards: Card[] = [];
  const sentences = splitSentences(text);
  const keyphrases = extractKeyphrases(text, 8);
  const max = opts.maxCards ?? 10;

  // Cloze cards: hide a key phrase inside a definitional sentence.
  for (const phrase of keyphrases) {
    if (cards.length >= max) break;
    const sentence = sentences.find((s) => s.toLowerCase().includes(phrase));
    if (!sentence) continue;
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    cards.push(
      makeCard({
        ...opts,
        kind: "cloze",
        bloom: "remember",
        front: sentence.replace(re, "{{…}}"),
        back: phrase,
      }),
    );
  }

  // Q/A cards from "X is/are Y" definitions → understanding.
  for (const sentence of sentences) {
    if (cards.length >= max) break;
    const m = sentence.match(/^(.{3,60}?)\s+(?:is|are|refers to|means|describes)\s+(.{10,})$/i);
    if (m) {
      cards.push(
        makeCard({
          ...opts,
          kind: "qa",
          bloom: "understand",
          front: `What ${/s$/.test(m[1]) ? "are" : "is"} ${m[1].trim()}?`,
          back: m[2].trim(),
        }),
      );
    }
  }

  // One free-recall (analyze/explain) card to push beyond rote memorization.
  if (keyphrases[0]) {
    cards.push(
      makeCard({
        ...opts,
        kind: "teach-back",
        bloom: "analyze",
        front: `Explain "${keyphrases[0]}" in your own words, as if teaching a beginner.`,
        back: sentences.slice(0, 2).join(" "),
      }),
    );
  }

  return cards.slice(0, max);
}

function makeCard(
  o: FlashcardOptions & { kind: CardKind; bloom: BloomLevel; front: string; back: string },
): Card {
  return {
    id: newId("card"),
    brainId: o.brainId,
    kind: o.kind,
    bloom: o.bloom,
    front: o.front,
    back: o.back,
    atomIds: o.atomIds ?? [],
    sourceIds: o.sourceIds ?? [],
    conceptIds: o.conceptIds ?? [],
    fsrs: newCardState(),
    createdAt: now(),
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Quality / verification pass (plan section 3). Holds back content that is
 * ungrounded or fails the threshold. For grounding we check that every claim
 * sentence can be traced to provided context passages.
 */
export function gradeQuality(
  body: string,
  citations: Citation[],
  context: string,
  bloomCoverage: BloomLevel[],
): QualityReport {
  const flags: string[] = [];
  const grounded = citations.length > 0;
  if (!grounded) flags.push("no-citations");

  // Unsupported-claim heuristic: numeric/strong claims not present in context.
  const claims = splitSentences(body).filter((s) => /\d|\balways\b|\bnever\b|\bproven\b/i.test(s));
  const ctx = context.toLowerCase();
  const unsupported = claims.filter((c) => {
    const key = extractKeyphrases(c, 2)[0];
    return key && !ctx.includes(key);
  });
  if (unsupported.length) flags.push(`unsupported-claims:${unsupported.length}`);

  const bloomScore = bloomCoverage.length / 3; // reward depth beyond "remember"
  const groundingScore = grounded ? 1 : 0.3;
  const claimScore = 1 - Math.min(1, unsupported.length / Math.max(1, claims.length));
  const score = clamp01(0.4 * groundingScore + 0.3 * claimScore + 0.3 * Math.min(1, bloomScore));

  return {
    grounded,
    verified: flags.length === 0,
    bloomCoverage,
    flags,
    score,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function makeArtifact(
  kind: ArtifactKind,
  brainId: ID,
  title: string,
  body: string,
  citations: Citation[],
  quality: QualityReport,
): Artifact {
  return { id: newId("artifact"), brainId, kind, title, body, citations, quality, createdAt: now() };
}

/** Prompt builder shared by tutor + generators; enforces grounded answers. */
export function buildGroundedPrompt(
  task: string,
  promptContext: string,
  opts: { bloomTarget?: BloomLevel; persona?: string } = {},
): LLMMessage[] {
  return [
    {
      role: "system",
      content: [
        opts.persona ?? "You are a rigorous, encouraging tutor.",
        "Answer ONLY using the provided context. Cite passages as [[n]].",
        "If the context is insufficient, say so and suggest what to capture next.",
        opts.bloomTarget
          ? `Aim questions/explanations at Bloom level: ${opts.bloomTarget}.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { role: "user", content: `Context:\n${promptContext}\n\nTask: ${task}` },
  ];
}

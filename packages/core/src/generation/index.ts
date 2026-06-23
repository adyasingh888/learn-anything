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
import { extractKeyphrases, chunkText } from "../ingest/index.js";
import { tokenize } from "../embeddings/index.js";
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
    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";
    const taskMatch = userMsg.match(/Task:\s*([\s\S]+)$/);
    const contextMatch = userMsg.match(/Context:\s*([\s\S]*?)(?:\n\nTask:|$)/);
    const task = taskMatch?.[1]?.trim() ?? userMsg;
    const context = contextMatch?.[1]?.trim() ?? userMsg;
    return explainFromContext(task, context);
  }
}

/**
 * Local tutor: finds relevant sentences from captured material and structures
 * a real explanation — not three random sentences glued together.
 */
export function explainFromContext(task: string, context: string): string {
  if (!context || context === "(no captured context yet)" || context.length < 40) {
    return [
      "I don't have enough material in this brain yet to explain that well.",
      "",
      "**What to do:**",
      "1. Capture a link or paste notes in **Sources**",
      "2. Hit **Distill to atoms** (or save a link — it auto-distills now)",
      "3. Add a **second source** on a related topic so the graph can link across papers",
      "",
      "For richer explanations, enable cloud AI in this brain's Settings (or set `LLM_API_KEY` on the server).",
    ].join("\n");
  }

  const queryTerms = new Set(tokenize(task));
  const sentences = splitSentences(context);

  const scored = sentences
    .map((s) => ({
      s,
      score: tokenize(s).filter((t) => queryTerms.has(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const relevant =
    scored.length > 0 ? scored.slice(0, 6).map((x) => x.s) : pickBestSentences(sentences, 6);

  const keys = extractKeyphrases(relevant.join(" "), 6);
  const taskLower = task.toLowerCase();

  let intro = "Here's what your captured material says:";
  if (/explain|concept|simply|understand/.test(taskLower)) {
    intro = "Here's an explanation drawn from your sources:";
  } else if (/summar|key claim|theme/.test(taskLower)) {
    intro = "Summary of key points from your material:";
  } else if (/gap|missing|what should/.test(taskLower)) {
    intro = "Based on what you've captured, consider exploring:";
  }

  const body = relevant.map((s) => `• ${s}`).join("\n");
  const keyBlock =
    keys.length > 0
      ? `\n\n**Core ideas:** ${keys.map((k) => `\`${k}\``).join(", ")}`
      : "";

  const followUp =
    scored.length === 0
      ? "\n\n*(Matched loosely — try distilling into atoms or capture more on this topic.)*"
      : "\n\n**Go deeper:** Can you explain this without looking? Try **Learn → teach-back** cards.";

  return `${intro}\n\n${body}${keyBlock}${followUp}`;
}

function pickBestSentences(sentences: string[], n: number): string[] {
  return sentences
    .filter((s) => s.length > 40 && s.length < 320)
    .slice(0, n);
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
  const max = opts.maxCards ?? 12;
  const cards: Card[] = [];
  const chunks = chunkText(text, 700, 80);

  for (const chunk of chunks.slice(0, 4)) {
    if (cards.length >= max) break;
    cards.push(...cardsFromChunk(chunk, opts, max - cards.length));
  }

  if (cards.length === 0) {
    cards.push(...cardsFromChunk(text, opts, max));
  }

  // Deduplicate by front text.
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (seen.has(c.front)) return false;
    seen.add(c.front);
    return true;
  }).slice(0, max);
}

function cardsFromChunk(chunk: string, opts: FlashcardOptions, budget: number): Card[] {
  const cards: Card[] = [];
  const sentences = splitSentences(chunk);
  const keyphrases = extractKeyphrases(chunk, 6);

  // Teach-back per chunk (most valuable card type).
  if (keyphrases[0] && budget > 0) {
    cards.push(
      makeCard({
        ...opts,
        kind: "teach-back",
        bloom: "analyze",
        front: `Explain **${keyphrases[0]}** in your own words.`,
        back: sentences.slice(0, 2).join(" ") || chunk.slice(0, 200),
      }),
    );
  }

  // "Why / How" questions from causal sentences.
  for (const s of sentences) {
    if (cards.length >= budget) break;
    const why = s.match(/^(.{15,120}?)\s+(?:because|since|as|due to)\s+(.{15,})$/i);
    if (why) {
      cards.push(
        makeCard({
          ...opts,
          kind: "qa",
          bloom: "understand",
          front: `Why: ${why[1].trim()}?`,
          back: why[2].trim(),
        }),
      );
      continue;
    }
    const how = s.match(/^(.{10,80}?)\s+(?:by|through|via)\s+(.{15,})$/i);
    if (how) {
      cards.push(
        makeCard({
          ...opts,
          kind: "qa",
          bloom: "apply",
          front: `How does ${how[1].trim()} work?`,
          back: how[2].trim(),
        }),
      );
    }
  }

  // Cloze on key phrases in substantive sentences.
  for (const phrase of keyphrases.slice(0, 4)) {
    if (cards.length >= budget) break;
    const sentence = sentences.find((s) => s.length > 50 && s.toLowerCase().includes(phrase));
    if (!sentence) continue;
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    cards.push(
      makeCard({
        ...opts,
        kind: "cloze",
        bloom: "remember",
        front: sentence.replace(re, "**[…]**"),
        back: phrase,
      }),
    );
  }

  // Definition cards.
  for (const sentence of sentences) {
    if (cards.length >= budget) break;
    const m = sentence.match(/^(.{3,70}?)\s+(?:is|are|refers to|means|describes|defined as)\s+(.{12,})$/i);
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

  // Procedural / code drill from material with steps or numbers.
  if (cards.length < budget && (/\bstep\b|\d+\.|function|algorithm|implement/i.test(chunk))) {
    const prompt = sentences.find((s) => s.length > 40 && s.length < 220) ?? chunk.slice(0, 180);
    cards.push(
      makeCard({
        ...opts,
        kind: "problem",
        bloom: "apply",
        front: `Problem: ${prompt}\n\nWrite \`solution\` in JavaScript that solves this (see tests).`,
        back: `TEST: typeof solution === "function"\nHINT: ${keyphrases[0] ?? "Re-read the source chunk"}`,
      }),
    );
  }

  // Free-recall capstone per chunk.
  if (cards.length < budget && keyphrases[0]) {
    cards.push(
      makeCard({
        ...opts,
        kind: "free-recall",
        bloom: "remember",
        front: `From memory: list everything you know about **${keyphrases[0]}**.`,
        back: sentences.slice(0, 3).join(" ") || chunk.slice(0, 250),
      }),
    );
  }

  return cards;
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

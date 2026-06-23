/**
 * Generator plugin registry — dispatches GeneratorRef strings from mode configs.
 */
import { distillToAtomDrafts } from "../ingest/distill.js";
import { buildConceptMap } from "../graph/concept-map.js";
import { buildGradedChunks } from "../domain/graded-reader.js";
import { suggestMnemonics } from "../memory/mnemonics.js";
import { explainFromContext, generateFlashcardsHeuristic, gradeQuality, makeArtifact } from "../generation/index.js";
import { generateProblemSet } from "../generation/problem-set.js";
import { generateLitSynthesis } from "../generation/lit-synthesis.js";
import { generateCritiqueRubric } from "../generation/critique.js";
import { objectivesFromGoal } from "../session/objectives.js";
import { socraticTurn } from "../generation/socratic.js";
import { generateDialogueTurn } from "../audio/dialogue.js";
import type { Atom, Card, Concept, Edge, Objective, Source } from "../types.js";
import type { GeneratorRef } from "./types.js";
import type { LearningMode } from "./types.js";

export interface GeneratorContext {
  brainId: string;
  mode: LearningMode;
  text?: string;
  query?: string;
  atoms?: Atom[];
  sources?: Source[];
  concepts?: Concept[];
  edges?: Edge[];
  goal?: string;
}

export interface GeneratorOutput {
  atomDrafts?: ReturnType<typeof distillToAtomDrafts>;
  cards?: Card[];
  artifactBody?: string;
  artifactTitle?: string;
  gradedChunks?: ReturnType<typeof buildGradedChunks>;
  conceptMap?: ReturnType<typeof buildConceptMap>;
  objectives?: Objective[];
  dialogue?: string;
  socratic?: string;
  explain?: string;
  mnemonics?: ReturnType<typeof suggestMnemonics>;
}

type GeneratorFn = (ctx: GeneratorContext) => GeneratorOutput | Promise<GeneratorOutput>;

const GENERATORS: Partial<Record<GeneratorRef, GeneratorFn>> = {
  atomize: (ctx) => {
    if (!ctx.text) return {};
    return { atomDrafts: distillToAtomDrafts(ctx.text, ctx.sources?.[0]?.title ?? "Capture") };
  },
  summarize: (ctx) => {
    const text = ctx.text ?? ctx.sources?.map((s) => s.text).join("\n") ?? "";
    const body = explainFromContext("Summarize the key themes and claims.", text);
    return { artifactBody: body, artifactTitle: "Summary" };
  },
  explain: (ctx) => {
    const text = ctx.text ?? ctx.atoms?.map((a) => a.body).join("\n") ?? "";
    const q = ctx.query ?? "Explain the core ideas.";
    return { explain: explainFromContext(q, text) };
  },
  "concept-map": (ctx) => {
    if (!ctx.atoms?.length) return {};
    return { conceptMap: buildConceptMap(ctx.atoms, ctx.edges ?? [], ctx.concepts ?? []) };
  },
  socratic: (ctx) => {
    const text = ctx.atoms?.map((a) => a.body).join("\n") ?? ctx.text ?? "";
    const turn = socraticTurn(ctx.query ?? "What is the central idea?", text);
    return { socratic: turn.content };
  },
  dialogue: (ctx) => {
    const text = ctx.sources?.map((s) => s.text).join("\n") ?? ctx.text ?? "";
    return { dialogue: generateDialogueTurn(text, ctx.query) };
  },
  "graded-reader": (ctx) => {
    if (!ctx.sources?.length) return {};
    return { gradedChunks: buildGradedChunks(ctx.sources) };
  },
  "problem-set": (ctx) => {
    const text = ctx.text ?? ctx.sources?.map((s) => s.text).join("\n") ?? "";
    return { cards: generateProblemSet(ctx.brainId, text, ctx.sources?.map((s) => s.id) ?? []) };
  },
  mnemonic: (ctx) => {
    if (!ctx.atoms?.length) return {};
    return { mnemonics: suggestMnemonics(ctx.atoms, 8) };
  },
  "lit-synthesis": (ctx) => {
    if (!ctx.sources?.length && !ctx.atoms?.length) return {};
    const out = generateLitSynthesis(ctx.query ?? "central themes", ctx.sources ?? [], ctx.atoms ?? []);
    return { artifactBody: out.body, artifactTitle: out.title };
  },
  critique: (ctx) => {
    const text = ctx.text ?? "";
    const rubric = generateCritiqueRubric(text);
    return { artifactBody: rubric, artifactTitle: "Critique rubric" };
  },
  curriculum: (ctx) => {
    if (!ctx.goal?.trim()) return {};
    return { objectives: objectivesFromGoal(ctx.brainId, ctx.goal) };
  },
};

export function runGenerator(ref: GeneratorRef, ctx: GeneratorContext): GeneratorOutput {
  const fn = GENERATORS[ref];
  if (!fn) return {};
  return fn(ctx) as GeneratorOutput;
}

export function runStageGenerators(
  mode: LearningMode,
  stage: keyof LearningMode["loopStages"],
  ctx: GeneratorContext,
): GeneratorOutput {
  const refs = mode.loopStages[stage] ?? [];
  const merged: GeneratorOutput = {};
  for (const ref of refs) {
    const out = runGenerator(ref, ctx);
    if (out.atomDrafts) merged.atomDrafts = [...(merged.atomDrafts ?? []), ...out.atomDrafts];
    if (out.cards) merged.cards = [...(merged.cards ?? []), ...out.cards];
    if (out.gradedChunks) merged.gradedChunks = out.gradedChunks;
    if (out.conceptMap) merged.conceptMap = out.conceptMap;
    if (out.objectives) merged.objectives = out.objectives;
    if (out.mnemonics) merged.mnemonics = out.mnemonics;
    if (out.artifactBody) {
      merged.artifactBody = out.artifactBody;
      merged.artifactTitle = out.artifactTitle;
    }
    if (out.explain) merged.explain = out.explain;
    if (out.socratic) merged.socratic = out.socratic;
    if (out.dialogue) merged.dialogue = out.dialogue;
  }
  return merged;
}

/** Filter generated cards to mode-preferred kinds and apply quality threshold. */
export function filterCardsForMode(cards: Card[], mode: LearningMode, context = ""): Card[] {
  const preferred = new Set(mode.preferredCardKinds);
  let filtered = cards.filter((c) => preferred.has(c.kind));
  if (filtered.length === 0) filtered = cards;

  if (mode.qualityThreshold <= 0 || !context) return filtered;

  return filtered.filter((c) => {
    const q = gradeQuality(c.back, [], context, [c.bloom]);
    return q.score >= mode.qualityThreshold * 0.7;
  });
}

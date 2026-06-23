/**
 * Feedback plugin registry — unified scoring for all activity types.
 */
import { gradeTeachBack } from "../generation/teach-back-grade.js";
import { gradeFreeRecall } from "../domain/free-recall.js";
import { runCodeTests, parseCodeTests } from "../drill/code-tests.js";
import { scorePronunciation } from "../audio/pronunciation.js";
import { analyzeRecordingMeta } from "../audio/analysis.js";
import type { FeedbackProvider } from "./types.js";

export interface FeedbackInput {
  provider: FeedbackProvider;
  topic?: string;
  response?: string;
  context?: string;
  expected?: string;
  code?: string;
  testBack?: string;
  audioMeta?: { durationSec?: number; pitchHz?: number; targetBpm?: number };
  rubricChecks?: Record<string, boolean>;
  selfRating?: number;
}

export interface FeedbackResult {
  score: number;
  summary: string;
  details?: Record<string, unknown>;
}

export function runFeedback(input: FeedbackInput): FeedbackResult {
  switch (input.provider) {
    case "text-grade": {
      const g = gradeTeachBack(input.topic ?? "topic", input.response ?? "", input.context ?? "");
      return { score: g.score, summary: g.summary, details: { gotRight: g.gotRight, gaps: g.gaps } };
    }
    case "self-rating":
      return {
        score: clamp01(input.selfRating ?? 0.5),
        summary: `Self-rated ${Math.round((input.selfRating ?? 0.5) * 100)}%`,
      };
    case "rubric": {
      const checks = input.rubricChecks ?? {};
      const keys = Object.keys(checks);
      const hit = keys.filter((k) => checks[k]).length;
      const score = keys.length ? hit / keys.length : 0;
      return { score, summary: `Rubric ${hit}/${keys.length}` };
    }
    case "code-tests": {
      const { tests } = parseCodeTests(input.testBack ?? "");
      const results = runCodeTests(input.code ?? "", tests);
      const pass = results.filter((r) => r.pass).length;
      const score = results.length ? pass / results.length : 0;
      return { score, summary: `${pass}/${results.length} tests passed`, details: { results } };
    }
    case "answer-key": {
      const score = overlapText(input.response ?? "", input.expected ?? "");
      return { score, summary: score >= 0.55 ? "Correct enough" : "Review the answer" };
    }
    case "pronunciation": {
      const p = scorePronunciation(input.response ?? "", input.expected ?? "");
      return { score: p.score, summary: p.summary, details: { missed: p.missed } };
    }
    case "audio-analysis": {
      const a = analyzeRecordingMeta(input.audioMeta ?? {});
      return { score: a.score, summary: a.summary, details: a };
    }
    default:
      return { score: 0.5, summary: "No feedback provider" };
  }
}

function overlapText(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().match(/\p{L}+/gu) ?? []);
  const tb = new Set(b.toLowerCase().match(/\p{L}+/gu) ?? []);
  if (tb.size === 0) return 0;
  let hit = 0;
  for (const t of tb) if (ta.has(t)) hit++;
  return hit / tb.size;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

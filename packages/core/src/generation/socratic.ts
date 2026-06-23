/**
 * Offline Socratic tutor — probing questions from captured material.
 */
import { extractKeyphrases } from "../ingest/index.js";
import { tokenize } from "../embeddings/index.js";

export interface SocraticTurn {
  content: string;
  expectsAnswer: boolean;
}

/** Generate next tutor turn: question or feedback + follow-up. */
export function socraticTurn(
  question: string,
  context: string,
  userAnswer?: string,
  priorTurns: { role: "user" | "assistant"; content: string }[] = [],
): SocraticTurn {
  if (!context || context.length < 40) {
    return {
      content:
        "I need more captured material before I can guide you Socratically. Add sources first, then ask again.",
      expectsAnswer: false,
    };
  }

  const keys = extractKeyphrases(context, 8);
  const sentences = context
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 30 && s.length < 280);

  if (!userAnswer?.trim()) {
    const probe = buildProbe(question, keys, sentences, priorTurns);
    return { content: probe, expectsAnswer: true };
  }

  const overlap = answerOverlap(userAnswer, context);
  if (overlap < 0.15) {
    return {
      content: [
        "Your answer doesn't seem grounded in what you've captured yet.",
        "",
        `**Hint:** Look for material about **${keys[0] ?? "the core idea"}**.`,
        "",
        buildProbe(question, keys.slice(1), sentences, priorTurns),
      ].join("\n"),
      expectsAnswer: true,
    };
  }

  if (overlap < 0.4) {
    return {
      content: [
        "You're partly there. What evidence in your sources supports that?",
        "",
        sentences[0] ? `*Consider:* "${sentences[0].slice(0, 120)}…"` : "",
        "",
        `**Follow-up:** How would you connect **${keys[1] ?? keys[0]}** to your main question?`,
      ]
        .filter(Boolean)
        .join("\n"),
      expectsAnswer: true,
    };
  }

  return {
    content: [
      "Good — that aligns with your material.",
      "",
      `**Stretch:** What would someone who disagrees about **${keys[0]}** say, and how would you respond from your sources?`,
    ].join("\n"),
    expectsAnswer: true,
  };
}

function buildProbe(
  question: string,
  keys: string[],
  sentences: string[],
  prior: { role: string; content: string }[],
): string {
  const askedBefore = prior.filter((p) => p.role === "assistant").length;
  if (askedBefore >= 2) {
    return `**Synthesis:** You've answered ${askedBefore} probes. State your overall conclusion about **${keys[0] ?? "this topic"}** in 2–3 sentences.`;
  }
  const key = keys[0] ?? "the main concept";
  const qLower = question.toLowerCase();
  if (/gap|missing|what should/.test(qLower)) {
    return `**Question:** What important aspect of **${key}** is still missing from your captures?\n\n*Try naming one concrete thing to read or note next.*`;
  }
  if (/disagree|contradict|compare/.test(qLower)) {
    return `**Question:** Where do your sources disagree about **${key}**?\n\n*State one claim and what another source says differently.*`;
  }
  if (/summar|main argument|theme/.test(qLower)) {
    return `**Question:** In one sentence, what is the central claim about **${key}**?\n\n*Don't look at your notes yet — write from memory, then check.*`;
  }
  const snippet = sentences.find((s) => s.toLowerCase().includes(key.split(" ")[0])) ?? sentences[0];
  return [
    `**Question:** Why does **${key}** matter for understanding this topic?`,
    snippet ? `\n*From your material:* "${snippet.slice(0, 100)}…"` : "",
    "\n*Answer in your own words before I respond again.*",
  ]
    .filter(Boolean)
    .join("");
}

function answerOverlap(answer: string, context: string): number {
  const a = new Set(tokenize(answer));
  const c = tokenize(context);
  if (!c.length) return 0;
  let hit = 0;
  for (const t of c) if (a.has(t)) hit++;
  return hit / Math.min(c.length, 80);
}

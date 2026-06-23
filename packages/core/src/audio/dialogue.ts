/**
 * Offline dialogue turn generator for language immersion.
 */
import { extractKeyphrases } from "../ingest/index.js";

const OPENERS = [
  "Let's talk about",
  "Can you tell me more about",
  "What do you think about",
  "How would you describe",
];

export function generateDialogueTurn(context: string, topic?: string): string {
  if (!context || context.length < 30) {
    return "Add more source material first — I'll ask conversation questions from your captures.";
  }

  const keys = extractKeyphrases(context, 6);
  const focus = topic?.trim() || keys[Math.floor(Math.random() * keys.length)] || "this topic";
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];

  const prompt = `${opener} **${focus}**?`;
  const scaffold = keys[1] ? `\n\n*(Related: ${keys.slice(0, 3).join(", ")})*` : "";

  return `${prompt}${scaffold}\n\nRespond aloud or in writing — I'll probe deeper on your next turn.`;
}

export function dialogueFollowUp(userReply: string, context: string): string {
  const keys = extractKeyphrases(context, 5);
  const replyKeys = extractKeyphrases(userReply, 3);
  const gap = keys.find((k) => !replyKeys.some((r) => r.includes(k) || k.includes(r)));

  if (gap) {
    return `You didn't mention **${gap}** — how does that connect to what you said?`;
  }
  return "Can you give a concrete example from your own experience?";
}

/**
 * Structured critique rubric generator.
 */
import { extractKeyphrases } from "../ingest/index.js";

const RUBRIC = [
  "Clear thesis or central claim",
  "Evidence cited from source material",
  "Acknowledges counterarguments or limitations",
  "Logical structure (claim → evidence → implication)",
  "Original insight beyond summary",
];

export function generateCritiqueRubric(draft: string): string {
  const keys = extractKeyphrases(draft, 5);
  const lines = [
    "## Self-critique rubric",
    "",
    "Check each item against your draft:",
    "",
    ...RUBRIC.map((r, i) => `${i + 1}. [ ] ${r}`),
    "",
    keys.length ? `**Key terms to ground:** ${keys.join(", ")}` : "",
    "",
    "### Revision prompts",
    "- What is the weakest claim? How would you strengthen it?",
    "- What would a skeptical reader push back on?",
    "- What one sentence could you cut without losing meaning?",
  ];
  return lines.filter(Boolean).join("\n");
}

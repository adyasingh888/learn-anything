/**
 * Literature synthesis generator — offline extractive synthesis.
 */
import { extractKeyphrases } from "../ingest/index.js";
import type { Atom, Source } from "../types.js";

export function generateLitSynthesis(
  topic: string,
  sources: Source[],
  atoms: Atom[],
): { title: string; body: string } {
  const byTheme = new Map<string, string[]>();

  for (const s of sources) {
    const themes = extractKeyphrases(s.text, 4);
    const theme = themes[0] ?? s.title;
    if (!byTheme.has(theme)) byTheme.set(theme, []);
    byTheme.get(theme)!.push(`**${s.title}**: ${s.text.slice(0, 200)}…`);
  }

  for (const a of atoms.slice(0, 12)) {
    const theme = extractKeyphrases(a.body, 2)[0] ?? a.title;
    if (!byTheme.has(theme)) byTheme.set(theme, []);
    byTheme.get(theme)!.push(`**${a.title}**: ${a.body.slice(0, 160)}`);
  }

  const sections = [...byTheme.entries()].slice(0, 6).map(([theme, lines]) => {
    return `### ${theme}\n${lines.map((l) => `- ${l}`).join("\n")}`;
  });

  const gaps = [
    "What sources disagree on this topic?",
    "What methodological limitations appear across captures?",
    "What evidence is still missing for a strong claim?",
  ];

  const body = [
    `Synthesis focus: **${topic}**`,
    "",
    ...sections,
    "",
    "### Open gaps",
    ...gaps.map((g) => `- ${g}`),
    "",
    `*Based on ${sources.length} sources and ${atoms.length} atoms in your brain.*`,
  ].join("\n");

  return { title: `Synthesis: ${topic}`, body };
}

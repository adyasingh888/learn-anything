/**
 * Export a brain slice as readable Markdown — portable, no keys.
 */
import type { Atom, Artifact, Brain, Card, Concept, Edge, MasteryState, Objective, Path, Source } from "../types.js";

export interface BrainExportSlice {
  brain?: Brain;
  sources?: Source[];
  atoms?: Atom[];
  concepts?: Concept[];
  edges?: Edge[];
  cards?: Card[];
  objectives?: Objective[];
  mastery?: MasteryState[];
  paths?: Path[];
  artifacts?: Artifact[];
}

export function brainToMarkdown(slice: BrainExportSlice): string {
  const b = slice.brain;
  if (!b) return "";
  const lines: string[] = [
    `# ${b.name}`,
    "",
    b.goal ? `> **Goal:** ${b.goal}` : "",
    b.deadline ? `> **Target:** ${b.deadline}` : "",
    "",
    "---",
    "",
  ].filter(Boolean);

  const sources = slice.sources ?? [];
  if (sources.length) {
    lines.push("## Sources", "");
    for (const s of sources) {
      lines.push(`### ${s.title}`, "");
      if (s.url) lines.push(`[${s.url}](${s.url})`, "");
      lines.push(s.text.slice(0, 8000), "", "---", "");
    }
  }

  const atoms = slice.atoms ?? [];
  if (atoms.length) {
    lines.push("## Atoms", "");
    for (const a of atoms) {
      lines.push(`### ${a.title}`, "", a.body, "");
    }
  }

  const edges = (slice.edges ?? []).filter((e) => e.weight >= 1);
  if (edges.length && atoms.length) {
    const byId = new Map(atoms.map((a) => [a.id, a]));
    lines.push("## Links", "");
    for (const e of edges) {
      const from = byId.get(e.from)?.title ?? e.from;
      const to = byId.get(e.to)?.title ?? e.to;
      lines.push(`- **${from}** —${e.relation}→ **${to}**`);
    }
    lines.push("");
  }

  const objectives = slice.objectives ?? [];
  if (objectives.length) {
    lines.push("## Objectives", "");
    for (const o of objectives) {
      lines.push(`- [ ] ${o.title}`);
    }
    lines.push("");
  }

  const cards = slice.cards ?? [];
  if (cards.length) {
    lines.push("## Study cards", "");
    for (const c of cards.slice(0, 50)) {
      lines.push(`### ${c.kind}: ${c.front.replace(/\*\*/g, "")}`, "", `**A:** ${c.back}`, "");
    }
  }

  lines.push("", `*Exported from Learn Anything · ${new Date().toISOString().slice(0, 10)}*`);
  return lines.join("\n");
}

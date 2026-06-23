import type { DomainType } from "../types.js";

/** Human-facing catalog of domain types — used by the "new Brain" picker. */
export interface DomainInfo {
  type: DomainType;
  label: string;
  examples: string;
  emoji: string;
}

export const DOMAIN_CATALOG: DomainInfo[] = [
  { type: "general", label: "General / Curiosity", examples: "Articles, links, anything interesting", emoji: "🧠" },
  { type: "language", label: "Language", examples: "Spanish, Chinese, Japanese", emoji: "🗣️" },
  { type: "concept", label: "Concepts & Theory", examples: "Physics, history, biology, econ", emoji: "🔬" },
  { type: "procedural", label: "Practice & Problems", examples: "Math, programming, engineering", emoji: "🧮" },
  { type: "research", label: "Research / Dissertation", examples: "Lit review, thesis, papers", emoji: "📚" },
  { type: "performance", label: "Instrument / Performance", examples: "Guitar, voice, sport, speaking", emoji: "🎻" },
  { type: "creative", label: "Creative", examples: "Writing, drawing, design", emoji: "🎨" },
  { type: "memory", label: "Memorization", examples: "Anatomy, law, vocabulary", emoji: "🃏" },
  { type: "exam", label: "Exam / Certification", examples: "USMLE, bar, SAT, GRE", emoji: "📝" },
  { type: "project", label: "Project / How-to", examples: "Cooking, photography, business", emoji: "🛠️" },
];

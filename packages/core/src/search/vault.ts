/**
 * Client-side vault search — no server, no keys.
 */
import { tokenize } from "../embeddings/index.js";
import type { Atom, Brain, Card, Source } from "../types.js";

export interface VaultHit {
  brainId: string;
  brainName: string;
  type: "brain" | "source" | "atom" | "card";
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export function searchVault(
  brains: Brain[],
  sources: Source[],
  atoms: Atom[],
  cards: Card[],
  query: string,
  limit = 12,
): VaultHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = tokenize(q);
  if (!terms.length) return [];

  const brainName = new Map(brains.map((b) => [b.id, b.name]));
  const hits: VaultHit[] = [];

  for (const b of brains) {
    const text = `${b.name} ${b.goal ?? ""}`.toLowerCase();
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        brainId: b.id,
        brainName: b.name,
        type: "brain",
        id: b.id,
        title: b.name,
        snippet: b.goal ?? b.name,
        score,
      });
    }
  }

  for (const s of sources) {
    const text = `${s.title} ${s.text}`.toLowerCase();
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        brainId: s.brainId,
        brainName: brainName.get(s.brainId) ?? "Brain",
        type: "source",
        id: s.id,
        title: s.title,
        snippet: s.text.slice(0, 160),
        score: score * 1.1,
      });
    }
  }

  for (const a of atoms) {
    const text = `${a.title} ${a.body}`.toLowerCase();
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        brainId: a.brainId,
        brainName: brainName.get(a.brainId) ?? "Brain",
        type: "atom",
        id: a.id,
        title: a.title,
        snippet: a.body.slice(0, 160),
        score: score * 1.15,
      });
    }
  }

  for (const c of cards) {
    const text = `${c.front} ${c.back}`.toLowerCase();
    const score = scoreText(text, terms);
    if (score > 0) {
      hits.push({
        brainId: c.brainId,
        brainName: brainName.get(c.brainId) ?? "Brain",
        type: "card",
        id: c.id,
        title: c.front.slice(0, 80),
        snippet: c.back.slice(0, 120),
        score,
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function scoreText(text: string, terms: string[]): number {
  if (!text) return 0;
  let hit = 0;
  for (const t of terms) if (text.includes(t)) hit++;
  return hit / terms.length;
}

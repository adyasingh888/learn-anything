/**
 * Semantic vault search — merges keyword + embedding similarity (free, on-device).
 */
import type { Embedder } from "../embeddings/index.js";
import { cosineSimilarity } from "../embeddings/index.js";
import { searchVault, type VaultHit } from "./vault.js";
import type { Atom, Brain, Card, Source } from "../types.js";

export async function searchVaultSemantic(
  embedder: Embedder,
  brains: Brain[],
  sources: Source[],
  atoms: Atom[],
  cards: Card[],
  query: string,
  limit = 14,
): Promise<VaultHit[]> {
  const lexical = searchVault(brains, sources, atoms, cards, query, limit * 2);
  if (query.trim().length < 3) return lexical.slice(0, limit);

  const qEmb = await embedder.embed(query);
  const scored: VaultHit[] = [];

  type Candidate = Omit<VaultHit, "score"> & { text: string };
  const candidates: Candidate[] = [];
  for (const s of sources) {
    candidates.push({
      brainId: s.brainId,
      brainName: brains.find((b) => b.id === s.brainId)?.name ?? "Brain",
      type: "source",
      id: s.id,
      title: s.title,
      snippet: s.text.slice(0, 160),
      text: `${s.title}\n${s.text.slice(0, 500)}`,
    });
  }
  for (const a of atoms) {
    candidates.push({
      brainId: a.brainId,
      brainName: brains.find((b) => b.id === a.brainId)?.name ?? "Brain",
      type: "atom",
      id: a.id,
      title: a.title,
      snippet: a.body.slice(0, 160),
      text: `${a.title}\n${a.body}`,
    });
  }

  const embedded = await Promise.all(
    candidates.slice(0, 40).map(async (c) => ({
      ...c,
      sem: cosineSimilarity(qEmb, await embedder.embed(c.text)),
    })),
  );

  for (const e of embedded.filter((x) => x.sem >= 0.2)) {
    const { sem, text: _text, ...hit } = e;
    scored.push({ ...hit, score: sem });
  }

  const merged = new Map<string, VaultHit>();
  for (const h of lexical) merged.set(`${h.type}-${h.id}`, h);
  for (const h of scored) {
    const key = `${h.type}-${h.id}`;
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, score: Math.max(prev.score, h.score) } : h);
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

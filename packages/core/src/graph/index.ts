/**
 * Per-brain knowledge graph: concepts (nodes) and typed edges. Atoms attach to
 * concepts; auto-linking proposes edges from embedding similarity and shared
 * concepts. User confirmation promotes an edge's weight to 1.
 */
import { cosineSimilarity } from "../embeddings/index.js";
import { newId } from "../ids.js";
import type { Atom, Concept, Edge, EdgeRelation, ID } from "../types.js";

export interface ScoredItem<T> {
  item: T;
  score: number;
}

/** Top-k most semantically similar items to a query embedding. */
export function nearest<T extends { embedding?: number[] }>(
  query: number[],
  items: T[],
  k = 8,
  minScore = 0.15,
): ScoredItem<T>[] {
  return items
    .filter((i) => i.embedding && i.embedding.length > 0)
    .map((item) => ({ item, score: cosineSimilarity(query, item.embedding!) }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Propose edges between a newly added atom and the rest of the graph.
 * Combines semantic similarity (embedding) with shared-concept overlap.
 */
export function suggestEdges(
  atom: Atom,
  others: Atom[],
  opts: { brainId: ID; threshold?: number; max?: number } = { brainId: atom.brainId },
): Edge[] {
  const threshold = opts.threshold ?? 0.35;
  const max = opts.max ?? 6;
  if (!atom.embedding) return [];
  const candidates = others
    .filter((o) => o.id !== atom.id && o.embedding)
    .map((o) => {
      const sem = cosineSimilarity(atom.embedding!, o.embedding!);
      const shared = sharedCount(atom.conceptIds, o.conceptIds);
      const score = sem + shared * 0.1;
      return { o, score };
    })
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return candidates.map(({ o, score }) => ({
    id: newId("edge"),
    brainId: opts.brainId,
    from: atom.id,
    to: o.id,
    relation: "related" as EdgeRelation,
    weight: Math.min(0.95, score), // auto-links never start fully confirmed
  }));
}

function sharedCount(a: ID[], b: ID[]): number {
  const set = new Set(a);
  return b.filter((x) => set.has(x)).length;
}

/** Merge/find a concept by label (case-insensitive, alias-aware). */
export function upsertConcept(
  concepts: Concept[],
  brainId: ID,
  label: string,
): { concept: Concept; created: boolean } {
  const norm = label.trim().toLowerCase();
  const found = concepts.find(
    (c) =>
      c.label.toLowerCase() === norm ||
      c.aliases.some((a) => a.toLowerCase() === norm),
  );
  if (found) return { concept: found, created: false };
  return {
    concept: { id: newId("concept"), brainId, label: label.trim(), aliases: [] },
    created: true,
  };
}

/** Simple connected-component analysis to surface clusters in the graph. */
export function components(nodeIds: ID[], edges: Edge[]): ID[][] {
  const parent = new Map<ID, ID>();
  const find = (x: ID): ID => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!);
      x = parent.get(x)!;
    }
    return x;
  };
  for (const id of nodeIds) parent.set(id, id);
  for (const e of edges) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue;
    parent.set(find(e.from), find(e.to));
  }
  const groups = new Map<ID, ID[]>();
  for (const id of nodeIds) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

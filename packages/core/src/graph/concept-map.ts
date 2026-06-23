/**
 * Build a hierarchical concept map from graph clusters — offline, no LLM.
 */
import { components } from "./index.js";
import type { Atom, Concept, Edge, ID } from "../types.js";

export interface ConceptMapNode {
  id: ID;
  label: string;
  sourceCount: number;
  children: ConceptMapNode[];
}

export function buildConceptMap(
  atoms: Atom[],
  edges: Edge[],
  concepts: Concept[],
): ConceptMapNode[] {
  const confirmed = edges.filter((e) => e.weight >= 1);
  const atomById = new Map(atoms.map((a) => [a.id, a]));
  const clusters = components(
    atoms.map((a) => a.id),
    confirmed,
  ).filter((c) => c.length > 0);

  if (clusters.length === 0 && atoms.length > 0) {
    return [
      {
        id: "root",
        label: "All atoms",
        sourceCount: new Set(atoms.flatMap((a) => a.sourceIds)).size,
        children: atoms.slice(0, 8).map((a) => ({
          id: a.id,
          label: a.title,
          sourceCount: a.sourceIds.length,
          children: [],
        })),
      },
    ];
  }

  return clusters.slice(0, 6).map((cluster, i) => {
    const clusterAtoms = cluster.map((id) => atomById.get(id)).filter(Boolean) as Atom[];
    const label = clusterLabel(clusterAtoms, concepts) ?? `Topic cluster ${i + 1}`;
    const sourceCount = new Set(clusterAtoms.flatMap((a) => a.sourceIds)).size;
    return {
      id: `cluster-${i}`,
      label,
      sourceCount,
      children: clusterAtoms.slice(0, 8).map((a) => ({
        id: a.id,
        label: a.title,
        sourceCount: a.sourceIds.length,
        children: [],
      })),
    };
  });
}

function clusterLabel(atoms: Atom[], concepts: Concept[]): string | undefined {
  const counts = new Map<string, number>();
  for (const a of atoms) {
    for (const cid of a.conceptIds) {
      const c = concepts.find((x) => x.id === cid);
      if (c) counts.set(c.label, (counts.get(c.label) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [label, n] of counts) {
    if (n > bestN) {
      best = label;
      bestN = n;
    }
  }
  return best ?? atoms[0]?.title;
}

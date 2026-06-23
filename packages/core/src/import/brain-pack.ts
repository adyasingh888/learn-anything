/**
 * Import a per-brain export pack as a new brain (remaps all IDs).
 */
import { newId, now } from "../ids.js";
import type { BrainExportSlice } from "../export/markdown.js";
import type {
  Activity,
  Artifact,
  Atom,
  Brain,
  Card,
  Concept,
  Edge,
  MasteryState,
  Objective,
  Path,
  Source,
} from "../types.js";

export interface ImportResult {
  brain: Brain;
  sources: Source[];
  atoms: Atom[];
  concepts: Concept[];
  edges: Edge[];
  cards: Card[];
  objectives: Objective[];
  mastery: MasteryState[];
  paths: Path[];
  activities: Activity[];
  artifacts: Artifact[];
}

export function importBrainPack(slice: BrainExportSlice): ImportResult | null {
  const oldBrain = slice.brain;
  if (!oldBrain) return null;

  const brainId = newId("brain");
  const idMap = new Map<string, string>();
  const map = (old: string) => {
    if (!idMap.has(old)) idMap.set(old, newId(old.split("_")[0] || "id"));
    return idMap.get(old)!;
  };

  const brain: Brain = {
    ...oldBrain,
    id: brainId,
    name: `${oldBrain.name} (imported)`,
    createdAt: now(),
    updatedAt: now(),
  };

  const sources = (slice.sources ?? []).map((s) => ({
    ...s,
    id: map(s.id),
    brainId,
    capturedAt: now(),
  }));

  const concepts = (slice.concepts ?? []).map((c) => ({
    ...c,
    id: map(c.id),
    brainId,
  }));

  const atoms = (slice.atoms ?? []).map((a) => ({
    ...a,
    id: map(a.id),
    brainId,
    sourceIds: a.sourceIds.map(map),
    conceptIds: a.conceptIds.map(map),
    createdAt: now(),
    updatedAt: now(),
  }));

  const edges = (slice.edges ?? []).map((e) => ({
    ...e,
    id: map(e.id),
    brainId,
    from: map(e.from),
    to: map(e.to),
  }));

  const cards = (slice.cards ?? []).map((c) => ({
    ...c,
    id: map(c.id),
    brainId,
    atomIds: c.atomIds.map(map),
    sourceIds: c.sourceIds.map(map),
    conceptIds: c.conceptIds.map(map),
    createdAt: now(),
  }));

  const objectives = (slice.objectives ?? []).map((o) => ({
    ...o,
    id: map(o.id),
    brainId,
    prerequisiteIds: o.prerequisiteIds.map(map),
  }));

  const mastery = (slice.mastery ?? []).map((m) => ({
    ...m,
    brainId,
    objectiveId: map(m.objectiveId),
    lastUpdated: now(),
  }));

  const paths = (slice.paths ?? []).map((p) => ({
    ...p,
    id: map(p.id),
    brainId,
    objectiveIds: p.objectiveIds.map(map),
  }));

  return {
    brain,
    sources,
    atoms,
    concepts,
    edges,
    cards,
    objectives,
    mastery,
    paths,
    activities: [],
    artifacts: (slice.artifacts ?? []).map((a) => ({
      ...a,
      id: map(a.id),
      brainId,
    })) ?? [],
  };
}
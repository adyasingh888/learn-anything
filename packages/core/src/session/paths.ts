/**
 * Curriculum paths from objectives.
 */
import { newId } from "../ids.js";
import type { ID, Objective, Path } from "../types.js";

export function pathFromObjectives(brainId: ID, objectives: Objective[], title = "Learning path"): Path {
  return {
    id: newId("path"),
    brainId,
    title,
    objectiveIds: objectives.map((o) => o.id),
  };
}

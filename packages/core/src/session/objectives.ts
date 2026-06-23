/**
 * Auto-derive learning objectives from a brain goal for mastery tracking.
 */
import { newId } from "../ids.js";
import type { BloomLevel, ID, Objective } from "../types.js";

export function objectivesFromGoal(brainId: ID, goal: string): Objective[] {
  const g = goal.trim();
  if (!g) return [];

  const segments = g
    .split(/[.;]\s+|\n+|,\s+(?=[A-Z])|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 6);

  const titles =
    segments.length >= 2
      ? segments.slice(0, 3)
      : [
          `Understand: ${truncate(g, 80)}`,
          "Recall and explain key facts from your material",
          "Apply under timed practice (mock exam / drills)",
        ];

  const blooms: BloomLevel[] = ["understand", "analyze", "apply"];
  const objs: Objective[] = titles.map((title, i) => ({
    id: newId("obj"),
    brainId,
    title: truncate(title, 100),
    bloomTarget: blooms[i] ?? "understand",
    prerequisiteIds: [],
  }));

  for (let i = 1; i < objs.length; i++) {
    objs[i].prerequisiteIds = [objs[i - 1].id];
  }
  return objs;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

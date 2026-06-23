/**
 * Project domain — tie activities to milestones.
 */
import type { Activity, Objective } from "../types.js";

export interface MilestoneActivitySummary {
  objectiveId: string;
  title: string;
  activityCount: number;
  avgScore: number | null;
  lastAt: number | null;
  kinds: string[];
}

export function milestoneActivitySummary(
  objectives: Objective[],
  activities: Activity[],
): MilestoneActivitySummary[] {
  return objectives.map((o) => {
    const related = activities.filter((a) => a.objectiveId === o.id);
    const scores = related.map((a) => a.score).filter((s): s is number => s != null);
    const kinds = [...new Set(related.map((a) => a.kind))];
    return {
      objectiveId: o.id,
      title: o.title,
      activityCount: related.length,
      avgScore: scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null,
      lastAt: related.length ? Math.max(...related.map((a) => a.at)) : null,
      kinds,
    };
  });
}

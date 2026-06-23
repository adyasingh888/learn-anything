/**
 * Curriculum gating — filter session cards to current mastery objective.
 */
import { isMastered, nextObjective } from "./index.js";
import type { Card, MasteryState, Objective } from "../types.js";

export function gateSessionCards(
  cards: Card[],
  objectives: Objective[],
  mastery: MasteryState[],
): Card[] {
  if (!objectives.length) return cards;

  const map = new Map(mastery.map((m) => [m.objectiveId, m]));
  const current = nextObjective(objectives, map);
  if (!current) return cards;

  const linked = cards.filter(
    (c) =>
      (current.conceptIds?.length &&
        c.conceptIds.some((id) => current.conceptIds!.includes(id))) ||
      (current.cardIds?.length && current.cardIds.includes(c.id)),
  );

  // If no explicit links, prefer cards from atoms matching objective title tokens
  if (!linked.length) {
    const tokens = new Set(current.title.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
    const soft = cards.filter((c) => {
      const text = `${c.front} ${c.back}`.toLowerCase();
      return [...tokens].some((t) => text.includes(t));
    });
    if (soft.length >= 3) return soft;
    return cards;
  }

  return linked.length >= 3 ? linked : [...linked, ...cards].slice(0, cards.length);
}

export function canAdvanceObjective(
  objectives: Objective[],
  mastery: MasteryState[],
  objectiveId: string,
): boolean {
  const map = new Map(mastery.map((m) => [m.objectiveId, m]));
  const o = objectives.find((x) => x.id === objectiveId);
  if (!o) return false;
  if (!isMastered(map.get(objectiveId))) return false;
  return o.prerequisiteIds.every((p) => isMastered(map.get(p)));
}